# -*- coding: UTF-8 -*
import argparse
import logging

from .scrapers import noppa

log = logging.getLogger(__name__)


def start(config={}):
    args = parser().parse_args()

    log.info('STARTING UP!')
    log.debug('Arguments given: {}'.format(args))

    scraper = noppa.Scraper(config=config, **vars(args))
    try:
        if args.command == 'scrape':
            scraper.scrape()
        elif args.command == 'update':
            if not (args.id or args.title or args.departments):
                log.info('You need to specify at least one argument for update!')
                raise SystemExit
            scraper.update_courses()
        else:
            log.info('Undefined command! Exiting...')
    except KeyboardInterrupt:
        log.info('Interrupted! Exiting')


def parser():
    parser = argparse.ArgumentParser(
        description='Crawl and parse some Noppa data.'
        )

    parser.add_argument('-E', '--ensure-indexes',
        action='store_true',
        default='True',
        help='Force mongo to ensure collection indexes before parsing.'
        )

    parser.add_argument('-v', '--verbose',
        action='store_true',
        default=False,
        help='Print some useless info'
        )

    subparsers = parser.add_subparsers(
        help='sub-command help',
        dest='command'
        )

    update_parser = subparsers.add_parser('update',
        help=(
            'Update previously scraped data.'
            ' NOTE: You need to scrape the data before updating it!'
            )
        )

    update_parser.add_argument('-i', '--id',
        type=str,
        help=(
            'A complete or partial course ID.'
            'All courses matching the partial ID will be updated.'
            )
        )

    update_parser.add_argument('-t', '--title',
        type=str,
        help=(
            'A complete or partial course title.'
            'All courses matching the partial title will be updated.'
            )
        )

    update_parser.add_argument('-d', '--department',
        type=str,
        help='Deparment ID the course belongs to'
        )

    update_parser.add_argument('-l', '--lectures',
        action='store_true',
        default=False,
        help='Flag to toggle lecture parsing'
        )

    update_parser.add_argument('-e', '--exams',
        action='store_true',
        default=False,
        help='Flag to toggle exam parsing'
        )

    update_parser.add_argument('-w', '--weekly-exercises',
        action='store_true',
        default=False,
        help='Flag to toggle weekly exercise parsing'
        )

    update_parser.add_argument('-a', '--assignments',
        action='store_true',
        default=False,
        help='Flag to toggle assignment parsing'
        )

    scrape_parser = subparsers.add_parser('scrape',
        help='Scrape data from Noppa'
        )

    scrape_parser.add_argument('-o', '--organizations',
        action='store_true',
        default=False,
        help='Scrape organizations only'
        )

    scrape_parser.add_argument('-d', '--departments',
        action='store_true',
        default=False,
        help='Scrape departments only'
        )

    scrape_parser.add_argument('-c', '--courses',
        action='store_true',
        default=False,
        help=('Scrape courses only. Note that you can provide --id or '
            '--title to narrow down the departments that you want to '
            'scrape from.')
        )

    scrape_parser.add_argument('-i', '--id',
        type=str,
        help=(
            'The department ID for which the course scraping is done.'
            ' Partial ID can be used to match multiple departments.'
            )
        )

    scrape_parser.add_argument('-t', '--title',
        type=str,
        help=(
            'The department title for which the course scraping is done.'
            ' Partial title can be used to match multiple departments.'
            )
        )

    return parser
