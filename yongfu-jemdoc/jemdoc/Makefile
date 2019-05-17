all:
	python2 ./jemdoc.py2 -c custom.conf -o ../ index.jemdoc
	python2 ./jemdoc.py2 -o ../contest/ contest.jemdoc
	python2 ./jemdoc.py2 -o ../module/ mr317.jemdoc
	python2 ./jemdoc.py2 -o ../ biography.jemdoc
	python2 ./jemdoc.py2 -o ../ teaching-statement.jemdoc
	python2 ./jemdoc.py2 -o ../ research-statement.jemdoc
	python2 ./jemdoc.py2 -o ../ news.jemdoc
	python2 ./jemdoc.py2 -o ../ industrial.jemdoc
	python2 ./jemdoc.py2 -o ../ modules.jemdoc
	python2 ./jemdoc.py2 -o ../ academic.jemdoc
	python2 ./jemdoc.py2 -o ../ services.jemdoc
	python2 ./jemdoc.py2 -o ../ people.jemdoc
	python2 ./jemdoc.py2 -o ../ softwares.jemdoc
	python2 ./jemdoc.py2 -o ../ hardwares.jemdoc
	python2 ./jemdoc.py2 -o ../ awards.jemdoc
	python2 ./jemdoc.py2 -o ../ topics.jemdoc
	python2 ./jemdoc.py2 -o ../ recruitment.jemdoc
	python2 ./jemdoc.py2 -o ../ eit.jemdoc
	python2 ./jemdoc.py2 -o ../ contact.jemdoc
	python2 ./jemdoc.py2 -o ../ bog.jemdoc
	python2 ./jemdoc.py2 -o ../ bog-bio.jemdoc
	python2 ./jemdoc.py2 -o ../ bog-qna.jemdoc
	python2 ./jemdoc.py2 -o ../ student-nus.jemdoc
	python2 ./jemdoc.py2 -o ../ student-sjtu.jemdoc
	python2 ../ref/bibconvert.py --suffix web --highlight "Y. Li" --highlight "Yongfu Li" --highlight "Li, Yongfu" --input ../ref/Top.bib --input ../ref/publications.bib --header publications_header.jemdoc > publications.jemdoc
	python2 ./jemdoc.py2  -o ../ publications.jemdoc
	python2 ./jemdoc.py2  -o ../ conferences.jemdoc

