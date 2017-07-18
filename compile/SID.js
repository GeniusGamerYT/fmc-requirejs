'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');

require('graceful-fs').gracefulify(fs);

var PATH = path.join(__dirname, require('./constants').ROOT_FOLDER + 'proc/');
var RWY_REGEXP = /^\d\d[LCR]?$/;

var waypoints = require('./compiled-data/waypoints.json');
var navaids = require('./compiled-data/navaids.json');

var fileList = require('./constants').readDir(PATH);
var SID = {};

fileList.forEach(function (file) {
    var airportName = file.substring(0, file.indexOf('.txt'));

    fs.readFileAsync(PATH + file, 'utf-8')
        .then(function (data) { parseFile(data, airportName); })
        .then(writeFile);
});


// --
function parseFile (fileContent, airportName) {
    // Splits each block (may contain SID, STAR, Final...)
    var temp = fileContent.split('\r\n\r\n');
    temp.shift();
    fileContent = []; // Empties fileContent for SID filters

    // Filters SID blocks and pushes to fileContent
    temp.forEach(function (block) {
        if (block.indexOf('SID') === 0) fileContent.push(block);
    });

    if (fileContent.length === 0) return;

    SID[airportName] = [];

    for (var blocks = 0; blocks < fileContent.length; blocks++) {
        // Splits each SID block by line (SID line)
        fileContent[blocks] = fileContent[blocks].split('\r\n');

        var obj = {
            name: undefined,
            runway: undefined,
            waypoints: []
        };

        for (var lines = 0; lines < fileContent[blocks].length; lines++) {
            // Splits each SID line by element
            fileContent[blocks][lines] = fileContent[blocks][lines].split(',');

            var potentialWaypoint = fileContent[blocks][lines][1];
            if (lines > 0 && (waypoints[potentialWaypoint] || navaids[potentialWaypoint])) {
                obj.waypoints.push(fileContent[blocks][lines][1].trim());

                // SID[airportName][SID[airportName].length - 1].waypoints.push({
                //     fix: fileContent[blocks][lines][1],
                //     altRes: 0 ? undefined : fileContent[blocks][lines][13],
                //     spdRes: 0 ? undefined : fileContent[blocks][lines][11]
                // });
            }
        }

        var descriptor = fileContent[blocks][0];
        var name = String(descriptor[1]).trim();
        var runway = String(descriptor[2]).trim();

        if (name) obj.name = name;
        if (RWY_REGEXP.test(runway)) obj.runway = runway;

        SID[airportName].push(obj);
    }

}

function writeFile () {
    fs.writeFileSync('compiled-data/SID.json', JSON.stringify(SID));
}