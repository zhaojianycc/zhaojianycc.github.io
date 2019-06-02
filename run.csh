#!/bin/csh -f

cd jemdoc
python2.7 ./jemdoc.py2 -o ../ index.jemdoc
python2.7 ./jemdoc.py2 -o ../ bio.jemdoc
python2.7 ./jemdoc.py2 -o ../ mr413.jemdoc
python2.7 ../ref/bibconvert.py --suffix web --highlight "Y. Li" --highlight "Yongfu Li" --highlight "Li, Yongfu" --input ../ref/Top.bib --input ../ref/MPL.test.bib --header publications_header.jemdoc > publications.jemdoc
python2.7 ./jemdoc.py2  -o ../ publications.jemdoc

cd ..
git add *
git commit -m "update webpage"
git push


