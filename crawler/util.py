# -*- coding: UTF-8 -*-
import urllib2


def fin_to_eng(keyword):
    d = {
        u'pvm': u'date',
        u'klo': u'time',
        u'päivä': u'day',
        u'vko': u'week',
        u'tila': u'location',
        u'aihe': u'topic',
        u'dl': u'deadline',
        u'otsikko': u'title'
    }
    return d.get(keyword, keyword)


def safe_urlopen(url, exit_on_fail=True):
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
