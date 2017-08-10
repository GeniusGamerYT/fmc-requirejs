'use strict';

const Promise = require('bluebird');

const fs = Promise.promisifyAll(require('fs'));
const path = require('path');

require('graceful-fs').gracefulify(fs);

const PATH = path.join(__dirname, `${require('./utils').ROOT_FOLDER}proc/`);
const RWY_REGEXP = /^\d\d[LCR]?$/;

const waypoints = require('./compiled-data/waypoints.json');
const navaids = require('./compiled-data/navaids.json');
const fileList = require('./utils').readDir(PATH);

let promises = [], STAR = {};

fileList.forEach(file => {
    promises.push(new Promise(resolve => {
        const airportName = file.substring(0, file.indexOf('.txt'));

        fs.readFileAsync(PATH + file, 'utf-8')
            .then(data => parseFile(data, airportName))
            .then(resolve);
    }));
});

module.exports = {
    promises: promises,
    writeFile: writeFile
};
// new Promise(resolve => {
//     console.log('Parsing STAR data');
//     Promise.all(promises).then(writeFile).then(resolve);
// });

// Callback functions
function parseFile (fileContent, airportName) {
    // Splits each block (may contain SID, STAR, Final...)
    let temp = fileContent.split('\r\n\r\n');
    temp.shift();
    fileContent = []; // Empties fileContent for STAR filters

    // Filters STAR blocks and pushes to fileContent
    temp.forEach(block => {
        if (block.indexOf('STAR') === 0) fileContent.push(block);
    });

    if (fileContent.length === 0) return;

    STAR[airportName] = [];

    for (let blocks = 0; blocks < fileContent.length; blocks++) {
        // Splits each STAR block by line (STAR line)
        fileContent[blocks] = fileContent[blocks].split('\r\n');

        let obj = {
            name: undefined,
            runway: undefined,
            transition: undefined,
            connecting: undefined,
            waypoints: []
        };

        for (let lines = 0; lines < fileContent[blocks].length; lines++) {
            // Splits each STAR line by element
            fileContent[blocks][lines] = fileContent[blocks][lines].split(',');

            const potentialWaypoint = fileContent[blocks][lines][1];
            if (lines > 0 && (waypoints[potentialWaypoint] || navaids[potentialWaypoint])) {
                obj.waypoints.push(fileContent[blocks][lines][1].trim());
            }
        }

        const descriptor = fileContent[blocks][0];
        const name = String(descriptor[1]).trim();
        const runway = String(descriptor[2]).trim();

        if (name) obj.name = name;
        if (RWY_REGEXP.test(runway)) obj.runway = runway;
        else if (runway === 'ALL') obj.connecting = true;
        else if (waypoints[runway] || navaids[runway]) obj.transition = runway;

        STAR[airportName].push(obj);
    }

}

function writeFile () {
    fs.writeFileSync('compiled-data/STAR.json', JSON.stringify(STAR));
}
