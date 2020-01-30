const log = require("fruster-log");
const fs = require("fs");
const { imageBaseUri } = require("../../conf");
const http = require(imageBaseUri.includes("https") ? "https" : "http");
const { Response: ExpResponse } = require("../../node_modules/express/lib/response.js");

module.exports = {

	sendError,

	parseBusMessage,

	getImageFileNameFromQuery,

	readFile,

	removeFile,

	getFileName,

	isImage,

	downloadFile

};

/**
 * Sends an fruster error as a http response.
 *
 * @param {ExpResponse} res - express response object
 * @param {Object} error - error to send
 */
function sendError(res, error) {
	res.status(error.status || 500).json(error);
}

/**
 * Parses bus message.
 *
 * @param {String} str - bus message to parse
 */
function parseBusMessage(str) {
	return !str ? {} : JSON.parse(str);
}

/**
 * Constructs a filename for fetching / saving resized images.
 *
 * @param {String} fileName - file name of file.
 * @param {Object} query - query to add to filename.
 */
function getImageFileNameFromQuery(fileName, { height = null, width = null, angle = null }) {
	const splitFileName = fileName.split(".");
	const fileNameWithoutFileType = fileName.replace("." + splitFileName[splitFileName.length - 1], "");
	const fileType = fileName.split(".")[splitFileName.length - 1];

	if (height || width) {
		if (height instanceof Array)
			height = height[0];

		if (width instanceof Array)
			width = width[0];

		return `${fileNameWithoutFileType}w-${width}h-${height}.${fileType}`;
	}

	if (angle)
		return `${fileNameWithoutFileType}a-${angle}.${fileType}`;
}

/**
 * An async wrapper for fs.readFile
 *
 * @param {String} path - path to file to read.
 */
function readFile(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, buffer) => {
			err ? reject(err) : resolve(buffer);
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
			err ? reject(err) : resolve();
		});
	});
}

/**
 * Get key from file URL
 *
 * @param {String} url Eg: https://fruster-uploads.s3.amazonaws.com/58a9b179-89ec-4790-9fa9-16dca9e1a4f5.jpg
 *
 * @return {String} Eg: 58a9b179-89ec-4790-9fa9-16dca9e1a4f5.jpg
 */
function getFileName(url) {
	return url.match(/\/([^\/]+)\/?$/)[1];
}

/**
 * Checks if file is of type image.
 *
 * @param {String} ext
 *
 * @returns {Boolean}
 */
function isImage(ext) {
	if (!ext)
		return false;

	return ["jpg", "jpeg", "png", "gif", "tiff", "svg", "webp"].includes(ext.toLowerCase());
}

/**
 * Download external file and save it to the temp location in the server
 *
 * @param {String} fileUrl
 * @param {String} location
 *
 * @returns {Promise<Void>}
 */
function downloadFile(fileUrl, location) {
	const file = fs.createWriteStream(location);

	return new Promise((resolve) => {
		const getRequest = http.get(fileUrl, (response) => {
			getRequest.end();

			response
				.pipe(file)
				.on("close", () => {
					file.end();
					resolve(response);
				});
		});
	});
}
