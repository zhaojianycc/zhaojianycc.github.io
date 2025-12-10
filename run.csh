#!/bin/csh -f

cd jemdoc
python2.7 ./jemdoc.py2 -o ../ index.jemdoc
python2.7 ./jemdoc.py2 -o ../ bio.jemdoc
python2.7 ./jemdoc.py2 -o ../ news.jemdoc
python2.7 ./jemdoc.py2 -o ../ teaching.jemdoc
python2.7 ../ref/bibconvert.py --suffix web --highlight "ZHAO Jian" --highlight "Zhao Jian" --highlight "Jian Zhao" --input ../ref/Top.bib --input ../ref/MyPublications.bib --header publications_header.jemdoc > publications.jemdoc
python2.7 ./jemdoc.py2  -o ../ publications.jemdoc
python2.7 ./jemdoc.py2 -o ../ services.jemdoc
python2.7 ./jemdoc.py2 -o ../ people.jemdoc
python2.7 ./jemdoc.py2 -o ../ recruitment.jemdoc
python2.7 ./jemdoc.py2 -o ../ topics.jemdoc
python2.7 ./jemdoc.py2 -o ../ contact.jemdoc
python2.7 ./jemdoc.py2 -o ../ rtesim.jemdoc
python2.7 ./jemdoc.py2 -o ../ memspn.jemdoc
python2.7 ./jemdoc.py2 -o ../ n4000.jemdoc
python2.7 ./jemdoc.py2 -o ../ leisure.jemdoc

cd ..
git add *
git commit -m "update webpage"
git push


