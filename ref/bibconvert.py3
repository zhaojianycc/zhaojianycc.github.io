#########################################################################
# File Name: bibconvert.py
# Author: Yongfu Li
# mail: liyongfu.sg@gmail.com
#########################################################################
#!/bin/python

import sys
import re
import datetime
import bibtexparser 

def read(filenames, commentPrefix):
    # read content from bibtex files 
    content = ""
    for filename in filenames:
        with open(filename) as inFile:
            for line in inFile:
                # remove comments 
                # it is not perfect now, since I cannot merge them 
                line = re.sub(re.compile("[ \t]"+commentPrefix+".*?$"), "", line)
                line = re.sub(re.compile("^"+commentPrefix+".*?$"), "", line)
                content = content+line+"\n"
    bibDB = bibtexparser.loads(content)
    return bibDB

def getDatetime(entry):
    date = entry['year']
    timeFormat = "%Y"
    if 'month' in entry and entry['month']:
        date = date+","+entry['month']
        timeFormat = "%Y,%B"
        if 'day' in entry and entry['day']:
            date = date+","+entry['day'].split('-', 1)[0]
            timeFormat = "%Y,%B,%d"
    return datetime.datetime.strptime(date, timeFormat)

def getAddressAndDate(entry):
    addressAndDate = ""
    prefix = ""
    if 'address' in entry and entry['address']:
        addressAndDate += prefix + entry['address']
        prefix = ", "
    if 'month' in entry and entry['month']:
        addressAndDate += prefix + datetime.datetime.strptime(entry['month'], "%B").strftime("%b")
        prefix = " " if 'day' in entry and entry['day'] else ", "
    if 'day' in entry and entry['day']:
        addressAndDate += prefix + entry['day'].replace("--", "-")
        prefix = ", "
    if 'year' in entry and entry['year']:
        addressAndDate += prefix + entry['year']
    return addressAndDate

# switch from [last name, first name] to [first name last name]
def switchToFirstLastNameStyle(author):
    authorArray = author.split('and')
    for i, oneAuthor in enumerate(authorArray):
        if ',' in oneAuthor:
            nameArray = oneAuthor.split(',')
            print(nameArray)
            assert len(nameArray) == 2, "len(nameArray) = %d" % len(nameArray)
            authorArray[i] = nameArray[1].strip() + ' ' + nameArray[0].strip()
        if i == 0:
            author = authorArray[i]
        elif i+1 < len(authorArray):
            author += ", " + authorArray[i]
        else:
            author += " and " + authorArray[i]
    return author

def printBibDB(bibDB, highlightAuthors, suffix, header):
    # differentiate journal and conference 
    # I assume journal uses 'journal' 
    # conference uses 'booktitle'
    # book uses 'publisher'
    journalEntries = [];
    conferenceEntries = [];
    bookEntries = [];
    thesisEntries = [];
    talkEntries = [];

    for entry in bibDB.entries:
        if 'journal' in entry:
            journalEntries.append(entry)
        elif 'publisher' in entry:
            bookEntries.append(entry);
        elif 'booktitle' in entry:
            conferenceEntries.append(entry)
        elif 'school' in entry:
            thesisEntries.append(entry);
        elif 'howpublished' in entry:
            talkEntries.append(entry);

    # sort by years from large to small 
    journalEntries.sort(key=lambda entry: getDatetime(entry), reverse=True)
    conferenceEntries.sort(key=lambda entry: getDatetime(entry), reverse=True)
    bookEntries.sort(key=lambda entry: getDatetime(entry), reverse=True)
    thesisEntries.sort(key=lambda entry: getDatetime(entry), reverse=True)
    talkEntries.sort(key=lambda entry: getDatetime(entry), reverse=True)

    stringMap = dict(bibDB.strings)

    # call kernel print functions 
    if header:
        print(header)
    if suffix.lower() == 'web':
        print("""
= Publications

""")

        printWeb(bibDB, stringMap, highlightAuthors, bookEntries, 'book', 'publisher')
        printWeb(bibDB, stringMap, highlightAuthors, journalEntries, 'journal', 'journal')
        printWeb(bibDB, stringMap, highlightAuthors, conferenceEntries, 'conference', 'booktitle')
        printWeb(bibDB, stringMap, highlightAuthors, thesisEntries, 'dissertation', 'school')
        printWeb(bibDB, stringMap, highlightAuthors, talkEntries, 'talk', 'howpublished')
    elif suffix.lower() == 'cv':
        print("""\\begin{rSection}{Publications}

""")

        printCV(bibDB, stringMap, highlightAuthors, bookEntries, 'book', 'publisher')
        printCV(bibDB, stringMap, highlightAuthors, journalEntries, 'journal', 'journal')
        printCV(bibDB, stringMap, highlightAuthors, conferenceEntries, 'conference', 'booktitle')
        printCV(bibDB, stringMap, highlightAuthors, thesisEntries, 'dissertation', 'school')
        printCV(bibDB, stringMap, highlightAuthors, talkEntries, 'talk', 'howpublished')

        print("""
\end{rSection}

""")
    else:
        assert 0, "unknown suffix = %s" % suffix

def printWeb(bibDB, stringMap, highlightAuthors, entries, publishType, booktitleKey):
    prefix = ""
    if publishType == 'journal':
        print("=== Journal Papers\n")
        prefix = "J"
    elif publishType == 'conference':
        print("=== Conference Papers\n")
        prefix = "C"
    elif publishType == 'book':
        print("=== Books / Book Chapters\n")
        prefix = "B"
    elif publishType == 'dissertation':
        print("=== Dissertation\n")
        prefix = "PHD"
    elif publishType == 'talk':
        print("=== Seminars / Talks\n")
        prefix = "P"
    # print 
    currentYear = '' 
    count = len(entries)
    for i, entry in enumerate(entries):
        if not currentYear or currentYear.lower() != entry['year'].lower():
            currentYear = entry['year']
            print("==== %s\n" % (currentYear))
        # switch from [last name, first name] to [first name last name]
        author = switchToFirstLastNameStyle(entry['author'])
        if highlightAuthors: # highlight some authors 
            for highlightAuthor in highlightAuthors:
                author = author.replace(highlightAuthor, "*"+highlightAuthor+"*")
        title = entry['title'].replace("{", "").replace("}", "")
        booktitle = stringMap[entry[booktitleKey]] if entry[booktitleKey] in stringMap else entry[booktitleKey]
        address = entry['address'] if 'address' in entry else ""
        publishlink = entry['publishlink'] if 'publishlink' in entry else ""
        annotate = entry['annotateweb'] if 'annotateweb' in entry else ""
        if publishlink: # create link if publishlink is set 
            title = "[" + publishlink + " " + title +"]"
        addressAndDate = getAddressAndDate(entry)
        print("""
- \[%s%d\] %s, 
  "%s", 
  %s, %s. 
  %s
        """ % (prefix, count, author, title, booktitle, addressAndDate,
        annotate))
        count = count-1

def printCV(bibDB, stringMap, highlightAuthors, entries, publishType, booktitleKey):
    prefix = ""
    if publishType == 'journal':
        print("""
\\textbf{Journal Papers}
        """)
        prefix = "J"
    elif publishType == 'conference':
        print("""
\\textbf{Conference Papers}
        """)
        prefix = "C"
    elif publishType == 'book':
        print("""
\\textbf{Books / Book Chapters}
        """)
    elif publishType == 'dissertation':
        print("""
\\textbf{Dissertation}
        """)
        prefix = "PHD"
    elif publishType == 'talk':
        print("""
\\textbf{Seminar / Talks}
        """)
        prefix = "P"


    print("""
\\begin{description}[font=\\normalfont]
%{{{
    """)

    # print 
    currentYear = '' 
    count = len(entries)
    for i, entry in enumerate(entries):
        if not currentYear or currentYear.lower() != entry['year'].lower():
            currentYear = entry['year']
        # switch from [last name, first name] to [first name last name]
        author = switchToFirstLastNameStyle(entry['author'])
        if highlightAuthors: # highlight some authors 
            for highlightAuthor in highlightAuthors:
                author = author.replace(highlightAuthor, "\\textbf{"+highlightAuthor+"}")
        title = entry['title']
        booktitle = stringMap[entry[booktitleKey]] if entry[booktitleKey] in stringMap else entry[booktitleKey]
        publishlink = entry['publishlink'] if 'publishlink' in entry else ""
        annotate = entry['annotatecv'] if 'annotatecv' in entry else ""
        if publishlink: # create link if publishlink is set 
            title = "\\href{" + publishlink + "}{" + title +"}"
        addressAndDate = getAddressAndDate(entry)
        if publishType == 'dissertation':
            print("""
\item[{[%s]}]{
        %s, 
    ``%s'', 
    %s, %s.
    %s
}
        """ % (prefix, author, title, booktitle, addressAndDate, annotate))

        else:
            print("""
\item[{[%s%d]}]{
        %s, 
    ``%s'', 
    %s, %s.
    %s
}
        """ % (prefix, count, author, title, booktitle, addressAndDate,
        annotate))
        count = count-1

    print("""
%}}}
\end{description}
    """)

def printHelp():
    print("""
usage: python bibconvert.py --suffix suffix --highlight author1 [--highlight author2] --input 1.bib [--input 2.bib]
suffix can be 'web' or 'cv'
    'web': jemdoc format for personal webpage 
    'cv': latex format for resume 
""")

if __name__ == "__main__":
    suffix = None
    highlightAuthors = []
    filenames = []
    header = ""

    if len(sys.argv) < 3 or sys.argv[1] in ('--help', '-h'):
        printHelp()
        raise SystemExit
    for i in range(1, len(sys.argv), 2):
        if sys.argv[i] == '--suffix':
            if suffix:
                raise RuntimeError("only one suffix can be accepted")
            suffix = sys.argv[i+1]
        elif sys.argv[i] == '--highlight':
            highlightAuthors.append(sys.argv[i+1])
        elif sys.argv[i] == '--input':
            filenames.append(sys.argv[i+1])
        elif sys.argv[i] == '--header':
            with open(sys.argv[i+1]) as headerFile:
                header = headerFile.read()
        else:
            break

    bibDB = read(filenames, "%")
    #print(bibDB.strings)
    #print(bibDB.entries)
    
    # write 
    printBibDB(bibDB, highlightAuthors, suffix, header)

