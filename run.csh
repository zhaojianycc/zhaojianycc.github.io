#!/bin/csh -f


cd jemdoc
python2.7 ./jemdoc.py2 -o ../ index.jemdoc
python2.7 ./jemdoc.py2 -o ../ bio.jemdoc
python2.7 ./jemdoc.py2 -o ../ mr413.jemdoc
cd ..
git add *
git commit -m "update webpage"
git push



