const Response = require("../../node_modules/express/lib/response.js");
const log = require("fruster-log");
const fs = require("fs");

module.exports = {

    sendError,

    parseBusMessage,

    getImageFileNameFromQuery,

    readFile,

    removeFile

};

/**
 * Sends an fruster error as a http response.
 * 
 * @param {Response} res - express response object
 * @param {Object} error - error to send
 */
function sendError(res, error) {
    res.status(error.status).json(error);
}

/**
 * Parses bus message. 
 * 
 * @param {String} str - bus message to parse
 */
function parseBusMessage(str) {
    if (!str) {
        return {};
    }
    return JSON.parse(str);
}

/**
 * Constructs a filename for fetching / saving resized images.
 * 
 * @param {String} fileName - file name of file. 
 * @param {Object} query - query to add to filename. 
 */
function getImageFileNameFromQuery(fileName, query, operationId) {
    const splitFileName = fileName.split(".");
    const fileNameWithoutFileType = fileName.replace("." + splitFileName[splitFileName.length - 1], "");
    const fileType = fileName.split(".")[splitFileName.length - 1];
    let height = query.height ? query.height : null;
    let width = query.width ? query.width : null;

    if (height instanceof Array)
        height = height[0];

    if (width instanceof Array)
        width = width[0];

    return `${fileNameWithoutFileType}w-${width}h-${height}.${fileType}`;
}

/**
 * An async wrapper for fs.readFile
 * 
 * @param {String} path - path to file to read.
*/
function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, buffer) => {
            if (err)
                reject(err);
            else
                resolve(buffer);
        });
    });
}

/**
 * An async wrapper for fs.unlink
 * 
 * @param {String} path - path to file to remove.
 */
function removeFile(path) {
    log.debug("removing file", path);
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}