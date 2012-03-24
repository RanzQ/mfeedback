#! /home/jr/mfeedback/bin python
# -*- coding: UTF-8 -*-

import urllib
import urllib2
import json
import re
import sys
import datetime
from os import path
from time import sleep
from bs4 import BeautifulSoup
from pymongo import Connection
from mongo_help import generate_ISO_date, ensure_indexes

class Scraper(object):
    
    def __init__(self, **kwargs):

        noppa_data = {}
        #print path.join(path.dirname(__file__), 'noppa.json')
        try:
            with open(path.join(path.dirname(__file__), 'noppa.json')) as f:
                noppa_data = json.load(f) 
        except IOError:
            print 'Could not open noppa.json containing noppa data!'
            print 'Falling back to defaults'
            

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
    
        # Compile some regular expressions
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

    

    def _urlopen(self, url, exit_on_fail=True):
        req = urllib2.Request(url)
        req.add_header('Cookie', 'org.apache.tapestry.locale=en')

        try:
            return urllib2.urlopen(req)
        except urllib2.URLError:
            print "Could not open url ", url
            if exit_on_fail:
                raise SystemExit
            else: 
                return None

    def update_organizations(self):
        ''' Update the list of organizations '''

        organizations = []

        # Open the base url to fetch the different course lists
        res = self._urlopen(self.courselist_url)

        # Make soup
        soup = BeautifulSoup(res.read())


        # Parse the links returned and extract the data
        for link in soup.find_all(href=self._org_re):
            href = link.get('href')
            organization_id = href.split('/')[-1]
            print href

            #organizations.append(
            organization = {
                'href': href, 
                'title': link.get_text(strip=True),
                'id': organization_id    
            }
            #)

            self._db.organizations.update({'id': organization_id}, 
                organization, safe=True, upsert=True)

        # Drop the old organizations table
        #self._db.organizations.drop()
        # Write everything to mongo
        #self._db.organizations.insert(organizations, safe=True)



    def update_departments(self):
        ''' Update the list of departments 

        
        '''

        organizations = self._db.organizations.find()

        for organization in organizations:
            # Make an new empty array for the departments
            # departments = []
        
            organization_id = organization['id']
            href = organization['href']

            full_url = self._noppa_url + href
            #continue
            res = self._urlopen(full_url)

            soup = BeautifulSoup(res.read())
            
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

            

            # Sleep for a second or two so we don't have to explain why we're DOSing Noppa with request spam
            sleep(2)

                

        #self.dumpJson()

    def _extract_courses(self, res, department_id, organization_id):
        ''' Extract courses from the response '''
        soup = BeautifulSoup(res.read())

        courses = []

        for link in soup.find_all(href=self._course_re):
            href = link.get('href')
            #print href
            course_id = href.split('/')[3]

            course = {
                'title': link.get_text(strip=True),
                'id': course_id,
                'department': department_id,
                'organization': organization_id
            } 

            self._db.courses.update({'id': course_id}, {'$set': course},
                safe=True, upsert=True)

            #courses.append(course)

        #return courses

    def _find_department(self, lookup_string):
        ''' Find a single department matching the lookup string '''
        return self._db.departments.find_one({'$or': [
                {'title': lookup_string}, {'id': lookup_string}
            ]})


    def update_department_course_list(self, department_lookup_string):
        ''' Update the course list for a single department '''
        
        department = self._find_department(department_lookup_string)
        if not department:
            return

        href = department['href']
        department_id = department['id']
        organization_id = department['organization']
        #courses = department['courses']

        full_url = self._noppa_url + href   
        res = self._urlopen(full_url)

        self._extract_courses(res, department_id, organization_id)


    """def find_course(self, keyword):
        noppa_search_url = 'https://noppa.aalto.fi/noppa/haku/{}'.format(keyword)
        res = self._urlopen(noppa_search_url)

        soup = BeautifulSoup(res.read())

        # The search results are in a table with id crsTableView
        courses_view = soup.find(id='crsTableView')
        try:
            # Reuse the lecture_re because were lazy and incompetent
            tbody = courses_view.tbody.find_all(id=self._lecture_re)
        except AttributeError:
            print '* WARN * COULD NOT FIND ANY COURSES'
            return

        print tbody
        for tr in tbody:

            id = tr.find_next('td').get_text(strip=True)
            href = tr.find_next('a').get('href')
            print id
            print href"""
          
    def update_course_lists(self, **kwargs):
        ''' Update every course list in every department '''
            
        
        search_args = {}
        for key in kwargs:
            if key in ['id', 'title'] and kwargs[key] is not None:
                search_args[key] = re.compile(re.escape(kwargs[key]), re.I)

        
        departments = self._db.departments.find(search_args)


        count = departments.count()
        print "Found {} different departments".format(count)

        # silly fix to add correct amount of spaces and backspaces
        s = '  ' if count < 10 else '   '
        print "Departments left to process:{}".format(s),
        

        b = ''
        for department in departments:
            b = '\b\b' if count < 9 else '\b\b\b'
            print '{}{}'.format(b, count),
            sys.stdout.flush()
            count -= 1

            href = department['href']
            department_id = department['id']
            organization_id = department['organization']
            #courses = data['courses']     

            full_url = self._noppa_url + href
        
            res = self._urlopen(full_url)

            self._extract_courses(res, department_id, organization_id)            

    
            # Sleep 2 seconds to avoid too many HTTP requests/second to noppa
            sleep(2)
        
        # Clear the number out of the console and replace it with done message
        print '{}Done!'.format(b)

      


    def _find_courses(self, **kwargs):
        ''' Find all courses with matching ID or name (either partial or full)'''

        # If the lookup string is empty return all courses
        if kwargs is None or len(kwargs) == 0:
            return self._db.courses.find()
        # Try to find the course from mongo with either using its id or title
        query = {}
        for key, value in kwargs.iteritems():
            print value
            query[key] = re.compile(re.escape(value), re.IGNORECASE)

        result = self._db.courses.find(query)
        return result


    def _update_lectures(self, course_url):
        ''' Update lectures for a single course '''
        res = self._urlopen(course_url + '/luennot', exit_on_fail=False)
        if not res:
            return []
        
        soup = BeautifulSoup(res.read())


        lecture_data = []

        # All the lectures are listed in a table with ID "leView"
        lectures_view = soup.find(id='leView')


        # Seperate the table head and body
        try:
            tbody = lectures_view.tbody.find_all(id=self._lecture_re)
            thead = lectures_view.thead.find_all(id=self._header_re)
        except AttributeError:
            print '* WARN * COULD NOT LOCATE LECTURES FOR THIS COURSE'
            return

        header_texts = []
        # Extract the header text so we can later use them
        for header in thead:
            header_texts.append(header.get_text(strip=True).lower())

        fin_to_eng = {
            u'pvm': u'date',
            u'klo': u'time',
            u'päivä': u'day',
            u'vko': u'week',
            u'tila': u'location',
            u'aihe': u'topic'
        }

        for tr in tbody:
            data = {}
            # Loop through each table row and extract the table data
            # Assign the extracted header texts to the correct data
            for i, td in enumerate(tr.find_all('td')):
                header_text = header_texts[i].lower()
                #if header_text in fin_to_eng:
                header_text = fin_to_eng.get(header_text, header_text)
                text = td.get_text(strip=True)
                # If the header appears to be a date, convert it to ISO format
                if header_text in [u'pvm', u'date']:
                    # Ensure that the header text is 'date' 
                    header_text = u'date'
                    text = generate_ISO_date(text)
                    #print text

                data[header_text] = text

            lecture_data.append(data)

        #print lecture_data
        course_id = course_url.split('/')[-1]
        self._set_course_data(course_id, 'lectures', lecture_data)


    def _update_weekly_exercises(self, course_url):
        ''' Update the weekly assignments for the given course '''
        pass
        #res = self._urlopen(course_url + '/

    def _update_assignments(self, course_url):
        ''' Update the assignments for the given course '''
        
        res = self._urlopen(course_url + '/harjoitustyot', exit_on_fail=False)
        if not res:
            return []

        soup = BeautifulSoup(res.read())

        assignment_data = []

        # All the assignments are listed in a table with ID "asView"
        assignments_view = soup.find(id='asView')

        # Seperate the table head and body
        try:
            tbody = assignments_view.tbody.find_all(id=self._lecture_re)
            thead = assignments_view.thead.find_all(id=self._header_re)
        except AttributeError:
            print '* WARN * COULD NOT LOCATE ASSIGNMENTS FOR THIS COURSE'
            return

        header_texts = []
        # Extract the header text so we can later use them
        for header in thead:
            header_texts.append(header.get_text(strip=True).lower())

        fin_to_eng = {
            u'dl': u'deadline',
            u'otsikko': u'title'
        }

        for tr in tbody:
            data = {}
            # Loop through each table row and extract the table data
            # Assign the extracted header texts to the correct data
            for i, td in enumerate(tr.find_all('td')):
                header_text = header_texts[i].lower()
                #if header_text in fin_to_eng:
                header_text = fin_to_eng.get(header_text, header_text)

                # If the header appears to be a date, convert it to ISO format
                if header_text in [u'dl', u'deadline']:
                    # Ensure that the header text is 'deadline'
                    header_text = u'deadline'
                    text = td.get_text(strip=True)
                    text = generate_ISO_date(text)
                    #print text
                else:
                    # Get assignment title
                    text = td.find('a').get_text(strip=True)


                data[header_text] = text

            assignment_data.append(data)

        # print assignment_data
        course_id = course_url.split('/')[-1]
        self._set_course_data(course_id, 'assignments', assignment_data)



    def _update_exams(self, course_url, soup=None):
        ''' Update the exams for the given course '''

        # If we have a ready made soup in arguments, use that instead
        if soup == None:
            res = self._urlopen(course_url + '/etusivu', exit_on_fail=False)
            if not res:
                return []
        
            soup = BeautifulSoup(res.read())

        course_id = course_url.split('/')[-1]

        #print soup.prettify() (Exams and mid-term exams)|
        try:
            exams_table = soup.find(text=re.compile(u'Tentit ja välikokeet|Exams and mid-term exams', re.I)).find_next('table')
        except AttributeError:
            print 'Couldn\'t locate the exams table!!!'
            return []

        #tr = exams_table.find_all('tr')
        #columns = len(tr.find_all('td'))
        
        # These are hard coded since they aren't visible anywhere on the site
        labels = ['day', 'date', 'time', 'place', 'title'] 

        exam_data = []
        for tr in exams_table.find_all('tr'):

            data = {}
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
                    data[label] = generate_ISO_date(text)
                else:
                    data[label] = text

                


            exam_data.append(data)

        self._set_course_data(course_id, 'exams', exam_data)


    def _set_course_data(self, course_id, target, data):
        ''' Update a single course in the database setting its target field to data '''
        #print target, data
        self._db.courses.update(
            {'id': course_id}, {
                '$set': {target: data} #,
                #'$set': {'updated': datetime.datetime.now()}
            }, safe=True)

    ## course_lookup_data
    def update_courses(self, **kwargs):
        ''' Update a single course completely (isActive, lectures, exams etc) '''

        search_args = {}
        for key, value in kwargs.iteritems():
            if key in ['id', 'title', 'department'] and value is not None:
                search_args[key] = value
            elif key == 'all' and value == True:
                kwargs['lectures'] = True
                kwargs['exams'] = True
                kwargs['weekly_exercises'] = True
                kwargs['assignments'] = True
        

        #course_lookup_data = course_lookup_data.lower()
        courses = self._find_courses(**search_args)
        total = courses.count()
        if  total == 0:
            print ('\nThe course query returned nothing', 
                'for the given parameters!\n',
                'You could try running "scrape --id or --title"',
                '<department> to scrape the course data from noppa')
            return

        for i, course in enumerate(courses):
            self._update(course, i, total, **kwargs)

    def _update(self, course, i, total, **kwargs):
        course_code = course['id']

        course_url = self._noppa_url + self._course_url + course_code
        i += 1
        print u'Updating {} ({}) [{}/{}]'.format(course['title'], course['id'], i, total)
        print course_url

        res = self._urlopen(course_url)

        soup = BeautifulSoup(res.read())

        if soup.find(id='notActive'):
            print 'Course was not active!'
            print 'Skipping...\n'
            self._set_course_data(course_code, 'isActive', False)
            sleep(1)
        else:
            flags = kwargs
            print 'Course was active!'
            self._set_course_data(course_code, 'isActive', True)
            if flags['lectures'] == True:
                print 'Updating lectures...',
                sys.stdout.flush()
                sleep(2)
                self._update_lectures(course_url)
                print ' Done!'
            if flags['exams'] == True:
                print 'Updating exams...',
                sys.stdout.flush()
                #sleep(2)
                self._update_exams(course_url, soup=soup)
                print ' Done!'
            if flags['weekly_exercises'] == True:
                print 'Would now update exercises....',
                sys.stdout.flush()
                sleep(2)
                print ' Done!'
            if flags['assignments'] == True:
                print 'Would now update assignments....',
                sys.stdout.flush()
                self._update_assignments(course_url)
                sleep(2)
                print ' Done!'
            print 'Done updating the course!\n'
            #print 'Updating weekly exercises...',
            #sys.stdout.flush()
            #course_data['weekly_exercises'] = self._update_weekly_exercises(course_url)
            #sleep(2)
            #print ' Done'


