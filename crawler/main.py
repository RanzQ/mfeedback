# -*- coding: UTF-8 -*
from noppa_scraper import Scraper
import argparse

parser = argparse.ArgumentParser(description='Crawl and parse some Noppa data.')

parser.add_argument('-E', '--ensure-indexes', action='store_true', default='True',
                    help='Force mongo to ensure collection indexes before parsing.')

parser.add_argument('-v', '--verbose', action='store_true', default='False',
                    help='Print some useless info')

subparsers = parser.add_subparsers(help='sub-command help')

update_parser = subparsers.add_parser('update', 
    help=('Update previously scraped data.' 
    ' NOTE: You need to scrape the data before updating it!'))

update_parser.add_argument('-i', '--id', type=str, 
    help='A complete or partial course ID. All courses matching the partial ID will be updated.')

update_parser.add_argument('-t', '--title', type=str, 
    help='A complete or partial course title. All courses matching the partial title will be updated.')

update_parser.add_argument('-d', '--department', type=str, help='Deparment ID the course belongs to')

update_parser.add_argument('-A', '--all', action='store_true', default='False',
                    help='Shortcut to parse everything')

update_parser.add_argument('-l', '--lectures', action='store_true', default='False',
                    help='Flag to toggle lecture parsing')

update_parser.add_argument('-e', '--exams', action='store_true', default='False',
                    help='Flag to toggle exam parsing')

update_parser.add_argument('-w', '--weekly-exercises', action='store_true', default='False',
                    help='Flag to toggle weekly exercise parsing')

update_parser.add_argument('-a', '--assignments', action='store_true', default='False',
                    help='Flag to toggle assignment parsing')


scrape_parser = subparsers.add_parser('scrape', help='Scrape data from Noppa')

scrape_parser.add_argument('-o', '--organizations', action='store_true', default='False',
                    help='Scrape organizations')

scrape_parser.add_argument('-d', '--departments', action='store_true', default='False',
                    help='Scrape departments')

scrape_parser.add_argument('-c', '--courses', action='store_true', default='False',
                    help='Scrape courses')

scrape_parser.add_argument('-i', '--id', type=str, 
    help=('The department ID for which the course scraping is done.'
        ' Partial ID can be used to match multiple departments.'))

scrape_parser.add_argument('-t', '--title', type=str, 
    help=('The department title for which the course scraping is done.'
    ' Partial title can be used to match multiple departments.'))

args = parser.parse_args()

print args
#raise SystemExit


scraper = Scraper(**vars(args))
update_args = {}
if 'exams' not in args:
    tasks = []
    parsed = False
    print 'Scraping stuff'
    #if args.all == True:
    #    args.organizations = True
    #    args.departments = True
    #    args.courses = True
    if args.organizations == True:
        tasks.append(scraper.update_organizations)
    if args.departments == True:
        tasks.append(scraper.update_departments)
    if args.courses == True:
        tasks.append(scraper.update_course_lists)

    if len(tasks) == 0:
        scraper.update_everything(**vars(args))
        raise SystemExit
    
    for task in tasks:
        task(**vars(args))

else:
    if not (args.id or args.title or args.department):
        print 'You need to specify at least one argument for update!'
        raise SystemExit
    try:
        scraper.update_courses(**vars(args))
    except KeyboardInterrupt:
        print '\nInterrupted!', 'Exiting'
    #answer = None
    #while answer not in ['yes', 'y', 'no', 'n', '']:
    #    answer = str(raw_input('Save the partial json? y/[n]'))
    #
    #if answer in ['yes', 'y']:
    #    print 'Dumping the results'
    #    crawler.dumpJson()
    #else:
    #    print 'Nothing to dump, exiting...'
