#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var sys = require('util');

var HTMLFILE_DEFAULT = null;
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = null;

function checkURL(value) {
    var urlregex = new RegExp("^(http:\/\/|https:\/\/|ftp:\/\/){1}([0-9A-Za-z]+\.)");
    if (urlregex.test(value)) {
        return (true);
    }
    return (false);
}

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertURLValid = function(url){
   if(!checkURL(url)){
       console.log("%s invalid URL. Exiting!", url);
       process.exit(1); 
   }
   return url; 
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};


var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};


var checkHtmlFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};


var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
        .option('-u, --url <url>', 'Uniform resouce locator to html file', clone(assertURLValid), URL_DEFAULT)
        .parse(process.argv);
    console.log("%s", program.file);
    console.log("%s",program.url);
    if(program.file===null && program.url===null){
	console.log("ERROR: Both File and URL unspecified");
	process.exit(1);
    }
    if (program.file!==null && program.url!==null){
	console.log("ERROR: Cannot specify URL and file at the same time.");
	process.exit(1);
    }

    // use file 
    if(program.file!==null){
	var checkJson = checkHtmlFile(program.file, program.checks);
	var outJson = JSON.stringify(checkJson, null, 4);
	console.log(outJson);
	process.exit(0);
    }

    if(program.url!==null){
	// Read the URL
	console.log("Reading URL");
	rest.get(program.url)
	    .on("complete", 
		function(response, headers){
		    console.log("Got response from url!");
		    if (response instanceof Error){
			console.error("Error: "+util.format(response.message));
		    }
		    else{
			console.log("Wrote %s", ".index.html");
			fs.writeFileSync(".index.html", response);
			var checkJson = checkHtmlFile(".index.html", program.checks);
			var outJson = JSON.stringify(checkJson, null, 4);
			console.log(outJson);
			fs.unlink(".index.html")
			process.exit(0);
		    }
		});
	// cannot exit heree because we want to wait from the response
    }
    
} else {
    exports.checkHtmlFile = checkHtmlFile;
}



