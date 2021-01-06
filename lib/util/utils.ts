import { Response } from "express";
import * as log from "fruster-log";
import * as fs from "fs";
import conf from "../../conf";
import http from "http";
import https from "https";
import ImageQuery from "../models/ImageQuery";

export const httpOrHttps = conf.imageBaseUri.includes("https") ? https : http;

/**
 * Sends an fruster error as a http response. 
 */
export function sendError(res: Response, error:any) {
	res.status(error.status || 500).json(error);
}

/**
 * Parses bus message.  
 */
export function parseBusMessage(str: string) {
	return !str ? {} : JSON.parse(str);
}

/**
 * Constructs a filename for fetching / saving updated images.
 *
 * @param {Object} query - query to add to filename.
 */
export function getImageFileNameFromQuery(fileName:string, { height, width, angle }: ImageQuery) {
	const splitFileName = fileName.split(".");
	const fileNameWithoutFileType = fileName.replace("." + splitFileName[splitFileName.length - 1], "");
	const fileType = fileName.split(".")[splitFileName.length - 1];

	const queryArray = [];

	if (width) {
		queryArray.push(`w-${width}`);
	}

	if (height) {
		queryArray.push(`h-${height}`);	
	}

	if (angle)
		queryArray.push(`a-${angle}`);

	return `${fileNameWithoutFileType}${queryArray.join("")}.${fileType}`;
}

/**
 * An async wrapper for fs.readFile
 *
 * @param {String} path - path to file to read.
 */
export function readFile(path: string) {
	return new Promise<Buffer>((resolve, reject) => {
		fs.readFile(path, (err, buffer) => {
			err ? reject(err) : resolve(buffer);
		});
	});
}

/**
 * An async wrapper for fs.unlink 
 */
export function removeFile(path: string) {
	log.debug("removing file", path);
	return new Promise<void>((resolve, reject) => {
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
export function getFileName(url:string) {
	// @ts-ignore
	return url.match(/\/([^\/]+)\/?$/)[1];
}

/**
 * Checks if file is of type image. 
 */
export function isImage(ext?: string) {
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
export function downloadFile(fileUrl:string, location:string) {
	const file = fs.createWriteStream(location);

	return new Promise((resolve) => {
		const getRequest = httpOrHttps.get(fileUrl, (response) => {
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
