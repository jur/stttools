// Script for replaying network packets (same as you would do something in the
// web browser).
//
// This script can be executed with node.js as follows:
//
// node genwgetfromhar.js stt.disruptorbeam.com.har "https://stt.disruptorbeam.com"
//
// bash stt.disruptorbeam.com.sh
//
// First parameter is a path to a har file.
// A bash script will be written (file extension .har will be replaced by .sh)
// har files can be saved in google chrome dev tool (SHIFT + CTRL + J) in
// context menu under network.
// This creates a bash script which can be executed to repeat the https requests.
// For example for getting player.json.
// The original response will be also extracted from har file and written to
// response*.json files.
// When you have done an action (for example scan, warp or buy something) it will
// also be repeated, so be careful what you repeat.

var host = "https://stt.disruptorbeam.com";
var mimetype = 'application/json';

if (process.argv[3]) {
	host = process.argv[3];
}
if (process.argv[4]) {
	mimetype = process.argv[4];
}

var fs = require('fs');

var harfilename = process.argv[2]
var bashfilename = harfilename.replace(/.har$/,".sh")

console.log(bashfilename)

if (harfilename !== bashfilename) {
	var util = require('util');
	var logFile = fs.createWriteStream(bashfilename, { flags: 'a' })

	console.log = function () {
		logFile.write(util.format.apply(null, arguments) + '\n');
	}
}

var harfile = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

console.log('#!/bin/bash');
console.log('# Created from ' + process.argv[2]);

var num = 0;
var entry;
for (entry of harfile.log.entries) {
	if (entry.request.url.includes(host)) {
		if (entry.response.content.mimeType !== mimetype) {
			// Only repeat when there was a JSON result in the original log.
			continue;
		}
		console.log('declare -a PARAMS');
		console.log('PARAMS+=("-O")');
		var jsonfilename = 'response' + num + '.json';
		console.log('PARAMS+=("' + jsonfilename + '")');
		var header;
		for (header of entry.request.headers) {
			if ((header.name.charAt(0) !== ':') && (header.name.toLowerCase() !== 'content-length')) {
				var value = header.value;

				value = value.replace(/\\/g, "\\\\");
				value = value.replace(/"/g, '\\"');
				value = value.replace(/\$/g, '\\$');
				console.log('PARAMS+=("--header=' + header.name + ': ' + value + '")');
			}
		}
		if (entry.response.content.text) {
			fs.writeFile(jsonfilename, entry.response.content.text, function (err, data) {
				if (err) {
					console.log(err);
				}
				// console.log(data);
			});
		}
		console.log("# method " + entry.request.method);
		if (entry.request.method === 'POST') {
			if (entry.request.postData) {
				var text = entry.request.postData.text;

				console.log("IFS= read -r -d '' POSTDATA <<EOF");
				console.log(text);
				console.log('EOF');
				console.log('PARAMS+=("--post-data=${POSTDATA}")');
			}
		}
		console.log('PARAMS+=("' + entry.request.url + '")');
		console.log('wget "${PARAMS[@]}"');
		console.log('unset PARAMS');
		console.log('jq "." "' + jsonfilename + '"');
		console.log('');
		num++;
	}
}
