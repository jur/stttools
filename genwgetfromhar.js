// Script for replaying network packets (same as you would do something in the
// web browser).
//
// This script can be executed with node.js as follows:
//
// node genwgetfromhar.js stt.disruptorbeam.com.har >bashscript.sh
//
// bash bashscript.sh
//
// First parameter is a path to a har file.
// har files can be saved in google chrome dev tool (SHIFT + CTRL + J) in
// context menu under network.
// This prints a bash script which can be executed to repeat the https requests.
// For example for getting player.json.
// When you have done an action (for example scan, warp or buy something) it will
// also be repeated, so be careful what you repeat.
console.log('#!/bin/bash');
console.log('# Created from ' + process.argv[2]);

var fs = require('fs');
var harfile = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

var num = 0;
var entry;
for (entry of harfile.log.entries) {
	if (entry.request.url.includes('https://stt.disruptorbeam.com')) {
		if (entry.response.content.mimeType !== 'application/json') {
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
