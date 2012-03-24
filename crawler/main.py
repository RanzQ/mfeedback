# -*- coding: UTF-8 -*
from noppa_scraper import Scraper
import argparse

parser = argparse.ArgumentParser(description='Crawl and parse some Noppa data.')

parser.add_argument('-E', '--ensure-indexes', action='store_true', default='True',
                    help='Force mongo to ensure collection indexes before parsing.')

parser.add_argument('-v', '--verbose', action='store_true', default='False',
                    help='Print some useless info')

subparsers = parser.add_subparsers(help='sub-command help')

update_parser = subparsers.add_parser('update', help='a help')

update_parser.add_argument('-i', '--id', type=str, 
    help='A complete or partial course ID. All courses matching the partial ID will be updated.')

update_parser.add_argument('-t', '--title', type=str, 
    help='A complete or partial course title. All courses matching the partial title will be updated.')

update_parser.add_argument('-d', '--department', type=str, help='Deparment ID the course belongs to')

update_parser.add_argument('-a', '--all', action='store_true', default='False',
                    help='Shortcut to parse everything')

update_parser.add_argument('-l', '--lectures', action='store_true', default='False',
                    help='Flag to toggle lecture parsing')

update_parser.add_argument('-e', '--exams', action='store_true', default='False',
                    help='Flag to toggle exam parsing')

update_parser.add_argument('-w', '--weekly-exercises', action='store_true', default='False',
                    help='Flag to toggle weekly exercise parsing')

update_parser.add_argument('-as', '--assignments', action='store_true', default='False',
                    help='Flag to toggle assignment parsing')



scrape_parser = subparsers.add_parser('scrape', help='Not much of a help')

scrape_parser.add_argument('-a', '--all', action='store_true', default='False',
                    help='Shortcut to scrape everything')

scrape_parser.add_argument('-o', '--organizations', action='store_true', default='False',
                    help='Scrape organizations')

scrape_parser.add_argument('-d', '--departments', action='store_true', default='False',
                    help='Scrape departments')

scrape_parser.add_argument('-c', '--courses', action='store_true', default='False',
                    help='Scrape courses')

scrape_parser.add_argument('-i', '--id', type=str)

scrape_parser.add_argument('-t', '--title', type=str)

args = parser.parse_args()

print args
#raise SystemExit


scraper = Scraper(**vars(args))
update_args = {}
if 'exams' not in args:
    print 'Scraping stuff'
    if args.all == True:
        args.organizations = True
        args.departments = True
        args.courses = True
    if args.organizations == True:
        scraper.update_organizations()
    if args.departments == True:
        scraper.update_departments()
    if args.courses == True:
        scraper.update_course_lists(**vars(args))
else:
    
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
