/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var cheerio = require('cheerio');
var request = require("request");
var jsonPretty = require('json-pretty');
var cookies = require('set-cookie-parser');
var download = require('download');

var tumblrName, password, authCookie;

const URL = () => `https://www.tumblr.com/blog_auth/${tumblrName}`;
const URL2  = () => `http://${tumblrName}.tumblr.com`;
const FINISH = 1;


function auth(password, cb) {
	
	var options = {
		"url": URL(), 
		"form": { 'password': password },
	};

	return new Promise((resolve, reject) => {

		console.log("Requesting:", options.url, "with password:", password);
		request.post(options, (err, res, body) => {
			
			if (err || res.statusCode != 200) {
				return reject("Error retreiving tumblr " + tumblrName + ". Check tumblr name.");
			}

			var $ = cheerio.load(body);
			var auth = $('#auth_send input').attr('value');
			if (!auth) {			
				return reject("Error finding auth token. HTML dumped");
			}
			console.log("Found auth token:", auth);

			options.url = URL2();
			options.form = { 'auth': auth };
			console.log("Requesting: ", options);
			request.post(options, (err, res, body) => {
				if (err) {
					return reject("Error performing auth process :(");				
				}
				
				authCookie = cookies
							.parse(res)
							.find(e => e.name === 'auth').value;

				console.log("Auth cookie:", authCookie);
				resolve(body);		
			});
			
		});
	});	

};


function getIframePictures(link) {
	
	var cookie = request.cookie('auth=' + authCookie);	
	var j = request.jar();
	j.setCookie(cookie, URL2());
	
	return new Promise((resolve, reject) => {
		
		console.log("Requesting: ", link);
		request.get({url: link, jar: j  }, (err, res, body) => {
			if (err || res.statusCode !== 200) {
				return reject(err);
			}

			var $ = cheerio.load(body);
			const pics = $("a")
			.filter(".photoset_photo")
			.map((i, e) => e.attribs.href)
			.toArray();

			Promise.all(pics
				.map(x => download(x, 'dist')))
				.then(() => resolve());

		})
	})
	
};


function parseBody(body, page) {

	var $ = cheerio.load(body);
	
	return new Promise((resolve, reject) => {

		const links = $('img')
			.filter((i, e) => e.attribs.src
			.includes('media.tumblr.com'))
			.map((i, e) => e.attribs.src)
			.toArray();
		
		const iframes = $("iframe")
			.filter(".photoset")
			.map((i, e) => URL2() + e.attribs.src)
			.toArray();

		if (!links.length) {
			console.log("No images found (page " + page + "). Ending.");
			return reject(FINISH);
		}

		Promise.all(iframes
			.map(l => (getIframePictures(l))))
			.then(() => {			
				console.log("Downloaded pictures from IFrame")
				Promise.all(links
					.map(l => download(l, 'dist')))
					.then(() => {
						console.log("Downloaded images from page:", page)
						resolve();
					});
			})
			.catch((err) => {
				console.log("Error processing IFrame: ", err.statusCode);
				reject();
			});		
	});	
	
};


function getPage(page) {	
	
	const url = (page === 1) ? URL2() : URL2() + '/page/' + page;
	const cookie = request.cookie('auth=' + authCookie);	
	const j = request.jar();
	j.setCookie(cookie, URL2());

	return new Promise((resolve, reject) => {
		
		console.log("Requesting: ", url );
		request.get({url: url, jar: j }, (err, res, body) => {
			if (err || res.statusCode !== 200) {				
				return reject(err || res.statusCode);
			}

			resolve(body);
		})
	})
}


function processPage(currentPage) {
	console.log("Processing page", currentPage);
	getPage(currentPage)
		.then((body) => parseBody(body, currentPage))
		.then(() => processPage(currentPage+1))
		.catch((err) => {
			if (err === FINISH) {
				console.log("Process Finished");
			} else {
				console.log("error getting page:", err);
			}
		
		});
	
} 


if( require.main === module ) {

	var params = process.argv.slice(2);	
	if (!params.length) {
		console.log('Usage: npm start [Tumblr name] <password>');
		return;
	}

	tumblrName = params[0];
	password = params[1];
	
	if (password) {
		auth(password)
		.then((body) => parseBody(body,1))
		.then(() => processPage(2))		 	
	} else {
		processPage(1);
	}


}