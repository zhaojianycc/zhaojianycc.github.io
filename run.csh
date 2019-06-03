#!/bin/csh -f

cd jemdoc
python2.7 ./jemdoc.py2 -o ../ index.jemdoc
python2.7 ./jemdoc.py2 -o ../ bio.jemdoc
python2.7 ./jemdoc.py2 -o ../ mr413.jemdoc
python2.7 ../ref/bibconvert.py --suffix web --highlight "ZHAO Jian" --highlight "Zhao Jian" --highlight "Jian Zhao" --input ../ref/Top.bib --input ../ref/MyPublications.bib --header publications_header.jemdoc > publications.jemdoc
python2.7 ./jemdoc.py2  -o ../ publications.jemdoc
python2.7 ./jemdoc.py2 -o ../ services.jemdoc
python2.7 ./jemdoc.py2 -o ../ people.jemdoc
python2.7 ./jemdoc.py2 -o ../ recruitment.jemdoc

cd ..
git add *
git commit -m "update webpage"
git push


