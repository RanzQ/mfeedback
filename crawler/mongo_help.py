import calendar
import pytz
from datetime import datetime

#{'': 0, 'Mar': 3, 'Feb': 2, 'Aug': 8, 'Sep': 9, 'Apr': 4, 'Jun': 6, 'Jul': 7, 'Jan': 1, 'May': 5, 'Nov': 11, 'Dec': 12, 'Oct': 10}
month_to_int = dict((v, k) for k, v in enumerate(calendar.month_abbr))

TIME_ZONE = 'Europe/Helsinki'


def ensure_indexes(db, collections, verbose=False):
    for collection in collections:
        db_collection = db[collection['name']]
        for field in collection['fields']:
            db_collection.ensure_index(field, unique=True)
            if verbose == True:
                print 'Unique index ensured for {} in collection {}'.format(field, collection['name'])


def get_utc_from_local(date_time, local_tz=None):
    assert date_time.__class__.__name__ == 'datetime'
    if local_tz is None:
        local_tz = pytz.timezone(TIME_ZONE)
    local_time = local_tz.normalize(local_tz.localize(date_time))
    return local_time.astimezone(pytz.utc)


def generate_ISO_date(date_string, verbose=False):
    date = None

    # Remove trailing whitespaces if any
    date_string = date_string.strip()

    try:
        date_str, time_str = date_string.split(' klo ')
    except ValueError:
        try:
            date_str, time_str = date_string.split(' at ')
        except ValueError:
            #print '\nProblem with splitting date and time! '
            #print 'Date given was ', date_string, '\n'
            #print 'Using 00.00 as the time'
            date_str = date_string
            time_str = '00.00'
        else:
            if verbose:
                print 'Splitting it as english date!'
    else:
        if verbose:
            print 'Splitting it as finnish date!'

    try:
        # If we fail to map int to the date string, it's likely to be in english format
        day, month, year = map(int, date_str.split('.'))
    except ValueError:
        day, month, year = date_str.split(' ')

        hour, minute = time_str.split('.')

        try:
            day = int(day)
            month = month_to_int[month]
            year = int(year)

        except ValueError:
            print '\nWARN! Could not convert the given date into ISO format!'
            print 'Date given was ', date_string, '\n'
            return date  # which should be None at this point
    finally:
        # If the year is more than 2 digits, assume it's not abbreviated
        if year > 99:
            pass
        else:
            year += 2000 if year < 70 else 1900


    try:
        # Try to map time to ints
        hour, minute = map(int, time_str.split('.'))
    except ValueError:
        print '\nWARN! Problem with reading time!'
        print 'Date given was ', date_string, '\n'
        return date  # which should be None at this point



    # Convert to UTC datetime
    date = get_utc_from_local(datetime(year, month, day, hour, minute),
        pytz.timezone('Europe/Helsinki'))

    #print date
    return date
