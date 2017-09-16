# ScrapyTumblr
Tumblr image scraper avoiding API and supporting password protected tumblrs

## Execution
1) Download the source and install the required third party library
~~~ sh
$ git clone https://github.com/vaguilera/ScrapyTumblr.git
$ npm install
~~~

2) Execute script passing the tumblr name and password as a parameters

~~~ sh
$ npm start [tumblr name] <password>
~~~

Tumblr name means ONLY THE NAME of the tumblr.
If you want to scrap http://mytumblr.tumblr.com just pass "mytumblr" as a parameter.
Password is optional.
