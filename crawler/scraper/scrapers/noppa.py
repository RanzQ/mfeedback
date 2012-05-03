#! /home/jr/mfeedback/bin python
# -*- coding: UTF-8 -*-

import re
import sys
import logging
from time import sleep
from bs4 import BeautifulSoup
from pymongo import Connection
from pymongo.objectid import ObjectId
from ..util import (
    ensure_indexes,
    fin_to_eng,
    generate_ISO_date,
    safe_urlopen
    )


log = logging.getLogger(__name__)


class Scraper(object):

    def __init__(self, config={}, **kwargs):

        noppa_data = {}
        #print path.join(path.dirname(__file__), 'noppa.json')
        # try:
        #     with open(path.join(path.dirname(__file__), 'noppa.json')) as f:
        #         noppa_data = json.load(f)
        # except IOError:
        if len(config) == 0:
            log.info('No config provided. Falling back to defaults')

        self._noppa_url = noppa_data.get('noppa_url', 'http://noppa.aalto.fi')
        self._courses_url = noppa_data.get('courses_url', '/noppa/kurssit/')
        self._course_url = noppa_data.get('course_url', '/noppa/kurssi/')

        self._kwargs = kwargs

        # The mongodb connection to default port at localhost
        connection = Connection()

        # Select the collection from db
        self._db = connection['mfeedback']

        collections = [
            {'name': 'feedback', 'fields': ['courseId', 'targetId']},
            {'name': 'courses', 'fields': ['id']},
            {'name': 'organizations', 'fields': ['id']},
            {'name': 'departments', 'fields': ['id']}
        ]

        if kwargs['ensure_indexes']:
            ensure_indexes(self._db, collections, kwargs['verbose'])

        self.courselist_url = self._noppa_url + self._courses_url

        # Compile some regular expressions for various purposes
        # Regex to match urls such as /noppa/kurssit/taik/a802
        self._courses_re = re.compile('^{}\w+\/\w+'.format(self._courses_url))

        # Regex to match urls such as /noppa/kurssi/T-1255.1243
        self._course_re = re.compile('^{}\w+'.format(self._course_url))

        # Regex to match organization urls /noppa/kurssit/taik
        self._org_re = re.compile('^{}\w+$'.format(self._courses_url))

        # The lectures will have an ID starting with string "informal" ie. "informal_4"
        self._lecture_re = re.compile('^informal')
        # The table headers will have an ID starting with "linkColumn"
        self._header_re = re.compile('^linkColumn')

        # The exam table regex
        self._exam_table_re = re.compile(u'Tentit ja välikokeet|Exams and mid-term exams', re.I)

        # The exam table rows regex
        self._exam_table_row_re = re.compile('even|odd')

    def _scrape_organizations(self, **kwargs):
        ''' Update the list of organizations '''

        # Open the base url to fetch the different course lists
        res = safe_urlopen(self.courselist_url)

        # Make soup
        soup = BeautifulSoup(res)

        # Parse the links returned and extract the data
        for link in soup.find_all(href=self._org_re):
            href = link.get('href')
            organization_id = href.split('/')[-1]
            log.debug('Organization URL {}'.format(href))

            organization = {
                'href': href,
                'title': link.get_text(strip=True),
                'id': organization_id
            }

            self._db.organizations.update({'id': organization_id},
                organization, safe=True, upsert=True)

        # Drop the old organizations table
        #self._db.organizations.drop()
        # Write everything to mongo
        #self._db.organizations.insert(organizations, safe=True)

    def _scrape_departments(self, **kwargs):
        ''' Scrape the list of departments '''

        organizations = self._db.organizations.find()

        for organization in organizations:
            # Make an new empty array for the departments
            # departments = []

            organization_id = organization['id']
            href = organization['href']

            full_url = self._noppa_url + href
            #continue
            res = safe_urlopen(full_url)

            soup = BeautifulSoup(res)

            for link in soup.find_all(href=self._courses_re):
                #print link.get_text()
                #print link.get('href')
                href = link.get('href')
                department_id = href.split('/')[-1]

                department = {
                    'organization': organization_id,
                    'title': link.get_text(strip=True),
                    'id': department_id,
                    'href': href
                }

                self._db.departments.update({'id': department_id}, department,
                    safe=True, upsert=True)

            # Sleep for a second or two so we don't have to
            # explain why we're DOSing Noppa with request spam
            sleep(2)

    def _extract_courses(self, res, department_id, organization_id):
        ''' Extract courses from the response '''
        soup = BeautifulSoup(res)

        for link in soup.find_all(href=self._course_re):
            href = link.get('href')
            #print href
            course_id = href.split('/')[3]

            course_data = {
                'title': link.get_text(strip=True),
                'id': course_id,
                'department': department_id,
                'organization': organization_id
            }

            self._db.courses.update({'id': course_id}, {'$set': course_data},
                safe=True, upsert=True)

    def _find_department(self, lookup_string):
        ''' Find a single department matching the lookup string '''
        return self._db.departments.find_one({'$or': [
                {'title': lookup_string}, {'id': lookup_string}
            ]})

    def _scrape_courses(self, **kwargs):
        ''' Scrape courses '''

        search_args = {}
        for key in kwargs:
            if key in ['id', 'title'] and kwargs[key] is not None:
                search_args[key] = re.compile(re.escape(kwargs[key]), re.I)

        departments = self._db.departments.find(search_args)

        count = departments.count()
        log.info("Found {} different departments".format(count))

        # silly fix to add correct amount of spaces and backspaces
        s = '  ' if count < 10 else '   '
        log.info("Departments left to process:{}".format(s))

        for department in departments:
            count -= 1

            href = department['href']
            department_id = department['id']
            organization_id = department['organization']

            full_url = self._noppa_url + href

            res = safe_urlopen(full_url)

            self._extract_courses(res, department_id, organization_id)

            # Sleep 2 seconds to avoid too many HTTP requests/second to noppa
            sleep(2)

        # Clear the number out of the console and replace it with done message
        log.info('Done processing the departments!')

    def _find_courses(self, **kwargs):
        ''' Find all courses with matching ID or name (either partial or full)'''

        # If the lookup string is empty return all courses
        if kwargs is None or len(kwargs) == 0:
            return self._db.courses.find()
        # Try to find the course from mongo with either using its id or title
        query = {}
        for key, value in kwargs.iteritems():
            log.debug(value)
            query[key] = re.compile(re.escape(value), re.IGNORECASE)

        result = self._db.courses.find(query)
        return result

    def _scrape_lectures(self, course_url, _id):
        ''' Update lectures for a single course '''
        res = safe_urlopen(course_url + '/luennot', exit_on_fail=False)
        if not res:
            return []

        soup = BeautifulSoup(res)
        course_id = course_url.split('/')[-1]
        _id = ObjectId(_id)
        #lecture_data = []

        # All the lectures are listed in a table with ID "leView"
        lectures_view = soup.find(id='leView')

        # Seperate the table head and body
        try:
            tbody = lectures_view.tbody.find_all(id=self._lecture_re)
            thead = lectures_view.thead.find_all(id=self._header_re)
        except AttributeError:
            log.warn('COULD NOT LOCATE LECTURES FOR COURSE {}'.format(course_url))
            return

        header_texts = []
        # Extract the header text so we can later use them
        for header in thead:
            header_texts.append(header.get_text(strip=True).lower())

        for tr in tbody:
            data = dict(course=course_id, _parent=_id)
            # Loop through each table row and extract the table data
            # Assign the extracted header texts to the correct data
            date = None
            for i, td in enumerate(tr.find_all('td')):
                header_text = header_texts[i].lower()

                header_text = fin_to_eng(header_text)
                text = td.get_text(strip=True)
                # If the header appears to be a date, convert it to ISO format
                if header_text in [u'pvm', u'date']:
                    # Ensure that the header text is 'date'
                    header_text = u'date'
                    text = generate_ISO_date(text)
                    date = text
                    #print text

                data[header_text] = text

                #print date
            # Try to update the lectures
            log.debug('Update data {}'.format(data))
            self._db.lectures.update(
                {'_parent': _id, 'date': date},
                {'$set': data}, safe=True, upsert=True
                )

        #print lecture_data
        #self._set_course_data(course_id, 'lectures', lecture_data)

    def _scrape_weekly_exercises(self, course_url):
        ''' Update the weekly assignments for the given course '''
        pass
        #res = safe_urlopen(course_url + '/

    def _scrape_assignments(self, course_url, _id):
        ''' Update the assignments for the given course '''

        res = safe_urlopen(course_url + '/harjoitustyot', exit_on_fail=False)
        if not res:
            return []

        soup = BeautifulSoup(res)

        course_id = course_url.split('/')[-1]
        _id = ObjectId(_id)
        #assignment_data = []

        # All the assignments are listed in a table with ID "asView"
        assignments_view = soup.find(id='asView')

        # Seperate the table head and body
        try:
            tbody = assignments_view.tbody.find_all(id=self._lecture_re)
            thead = assignments_view.thead.find_all(id=self._header_re)
        except AttributeError:
            log.warn('COULD NOT LOCATE ASSIGNMENTS FOR THIS COURSE {}'.format(course_url))
            return

        header_texts = []
        # Extract the header text so we can later use them
        for header in thead:
            header_texts.append(header.get_text(strip=True).lower())

        for tr in tbody:
            data = dict(course=course_id, _parent=_id)
            date = None
            # Loop through each table row and extract the table data
            # Assign the extracted header texts to the correct data
            for i, td in enumerate(tr.find_all('td')):
                header_text = header_texts[i].lower()
                #if header_text in fin_to_eng:
                header_text = fin_to_eng(header_text)

                # If the header appears to be a date, convert it to ISO format
                if header_text in [u'dl', u'deadline']:
                    # Ensure that the header text is 'deadline'
                    header_text = u'deadline'
                    text = td.get_text(strip=True)
                    text = generate_ISO_date(text)
                    date = text
                else:
                    # Get assignment title
                    text = td.find('a').get_text(strip=True)

                data[header_text] = text

            log.debug('Update data {}'.format(data))
            self._db.assignments.update(
                {'_parent': _id, 'deadline': date},
                {'$set': data}, safe=True, upsert=True
                )

    def _scrape_exams(self, course_url, _id, soup=None):
        ''' Update the exams for the given course '''

        # If we have a ready made soup in arguments, use that instead
        if soup == None:
            res = safe_urlopen(course_url + '/etusivu', exit_on_fail=False)
            if not res:
                return []

            soup = BeautifulSoup(res)

        course_id = course_url.split('/')[-1]
        _id = ObjectId(_id)

        #print soup.prettify() (Exams and mid-term exams)|
        try:
            exams_table = soup.find(text=self._exam_table_re).find_next('table')
        except AttributeError:
            log.warn('Couldn\'t locate the exams table!')
            return []

        #tr = exams_table.find_all('tr')
        #columns = len(tr.find_all('td'))

        # These are hard coded since they aren't visible anywhere on the site
        labels = ['day', 'date', 'time', 'place', 'title']

        for tr in exams_table.find_all('tr', {'class': self._exam_table_row_re}):

            data = dict(course=course_id, _parent=_id)
            date = None
            for i, td in enumerate(tr.find_all('td')):
                text = td.get_text(strip=True)
                # This might throw an IndexError! TODO: FIX IT
                label = 'undefined'
                try:
                    label = labels[i]
                except IndexError:
                    pass

                # Date is at index 1
                if i == 1:
                    text = generate_ISO_date(text)
                    data[label] = text
                    date = text
                else:
                    data[label] = text

            log.debug('Update data {}'.format(data))
            self._db.exams.update(
                {'_parent': _id, 'date': date},
                {'$set': data}, safe=True, upsert=True
                )

    def _set_course_data(self, course_id, target, data):
        ''' Update a single course in the database setting its target field to data '''
        #print target, data
        # course = self._db.courses.find_one({'id': course_id})
        # feedbacks = course[target]['feedbacks']
        # print feedbacks
        doc = self._db.courses.find_and_modify(
                {'id': course_id},
                {'$set': {target: data}},
                new=True,
                upsert=True,
                safe=True
                )
        return doc.get('_id')

    def _set_lecture_data(self, _id, course_data):
        ''' Update a single lecture '''
        self._db.lectures.update(
            {'_id': _id},
            course_data,
            safe=True,
            upsert=True
            )

    ## course_lookup_data
    def update_courses(self, **kwargs):
        ''' Update a single course completely (isActive, lectures, exams etc) '''

        update_targets = ['lectures', 'exams', 'assignments']

        search_args = {}
        update_args = {}
        true_count = len(update_targets)

        for key, value in kwargs.iteritems():
            if key in ['id', 'title', 'department'] and value is not None:
                search_args[key] = value
            elif key in update_targets:
                if value is False:
                    true_count -= 1
                update_args[key] = value

        log.debug('Update arguments: {}'.format(update_args))
        if true_count == 0:
            log.debug('No update targets found. Defaulting to all true.')
            for target in update_targets:
                update_args[target] = True

        #course_lookup_data = course_lookup_data.lower()
        courses = self._find_courses(**search_args)
        total = courses.count()
        if  total == 0:
            log.warn(
                'The course query returned nothing'
                'for the given parameters!'
                'You could try running "scrape --id or --title" '
                '<department> to scrape the course data from noppa'
                )
            return

        for i, course in enumerate(courses):
            self._update(course, i + 1, total, **update_args)

    def _update(self, course, index, total, **kwargs):

        course_code = course['id']

        course_url = self._noppa_url + self._course_url + course_code

        log.info(u'Updating {} ({}) [{}/{}]'
            .format(
                course['title'],
                course['id'],
                index,
                total
            )
        )

        res = safe_urlopen(course_url)

        soup = BeautifulSoup(res)

        if soup.find(id='notActive'):
            log.info('Course was not active!')
            log.info('Skipping...\n')
            self._set_course_data(course_code, 'isActive', False)
            sleep(1)
        else:
            flags = kwargs
            log.info('Course was active!')
            _id = self._set_course_data(course_code, 'isActive', True)
            if flags['lectures'] == True:
                log.info('Updating lectures')
                sleep(2)
                self._scrape_lectures(course_url, _id)
                log.info('Done updating lectures!')
            if flags['exams'] == True:
                log.info('Updating exams')
                sleep(2)
                self._scrape_exams(course_url, _id, soup=soup)
                log.info('Done updating exams!')
            if flags['assignments'] == True:
                log.info('Updating assignments')
                sys.stdout.flush()
                self._scrape_assignments(course_url, _id)
                sleep(2)
                log.info('Done updating assignments!')
            log.info('Done updating the course!')

    def scrape(self, **kwargs):
        tasks = []

        log.info('Scraping stuff')
        if kwargs['organizations'] == True:
            tasks.append(self._scrape_organizations)
        if kwargs['departments'] == True:
            tasks.append(self._scrape_departments)
        if kwargs['courses'] == True:
            tasks.append(self._scrape_courses)

        if len(tasks) == 0:
            self._scrape_organizations(**kwargs)
            self._scrape_departments(**kwargs)
            self._scrape_courses(**kwargs)
            return

        for task in tasks:
            task(**kwargs)
