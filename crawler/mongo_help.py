import datetime
import calendar

#{'': 0, 'Mar': 3, 'Feb': 2, 'Aug': 8, 'Sep': 9, 'Apr': 4, 'Jun': 6, 'Jul': 7, 'Jan': 1, 'May': 5, 'Nov': 11, 'Dec': 12, 'Oct': 10}
month_to_int = dict((v,k) for k,v in enumerate(calendar.month_abbr))


def ensure_indexes(db, collections, verbose=False):
    for collection in collections:
        db_collection = db[collection['name']]
        for field in collection['fields']:
            db_collection.ensure_index(field, unique=True)
            if verbose == True:
                print 'Unique index ensured for {} in collection {}'.format(field, collection['name'])


def generate_ISO_date(date_string):
    date = None

    # Remove trailing whitespaces if any
    date_string = date_string.strip()

    if not ('klo' or 'at') in date_string:
        date_str = date_string
        time_str = '00.00'
    else:
        try:
            date_str, time_str = date_string.split(' klo ')

            # If the date is in finnish format, date_str should be of length 10,
            # if not, let's try english format
            if len(date_str) != 10:
                date_str, time_str = date_string.split(' at ')
                if len(date_str) != 10:
                    raise ValueError

        except ValueError:
            print '\nProblem with splitting date and time! '
            print 'Date given was ', date_string, '\n'

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

    try:
        # Try to map time to ints
        hour, minute = map(int, time_str.split('.'))
    except ValueError:
        print '\nWARN! Problem with reading time!'
        print 'Date given was ', date_string, '\n'
        return date  # which should be None at this point

    finally:
        # If the year is more than 2 digits, assume it's not abbreviated
        if year > 99:
            pass
        else:
            year += 2000 if year < 70 else 1900

        date = datetime.datetime(year, month, day, hour, minute)

    #print date
    return date
