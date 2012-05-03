import json
import logging.config
from os import path


def read_config():
    try:
        with open(path.join(path.dirname(__file__), 'config.json')) as f:
            config = json.load(f)
            return config
    except IOError:
        print 'Could not open config.json'
        raise SystemExit


if __name__ == '__main__':
    config = read_config()
    logging.config.dictConfig(config.get('logging'))
    from scraper import start
    start(config=config)
