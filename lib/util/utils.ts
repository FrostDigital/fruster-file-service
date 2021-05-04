import { Response } from "express";
import * as log from "fruster-log";
import * as fs from "fs";
import S3Client from "../clients/S3Client";
import ImageQuery from "../models/ImageQuery";

/**
 * Sends an fruster error as a http response.
 */
export function sendError(res: Response, error: any) {
	console.log("sending error", error);
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
export function getImageFileNameFromQuery(fileName: string, { height, width, angle }: ImageQuery) {
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
export function getFileName(url: string) {
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
 * Downloads file from S3 and saves it to the temp location on
 * local file system.
 *
 * @param {String} fileUrl
 * @param {String} destination
 *
 * @returns {Promise<Void>}
 */
export async function downloadTempFile(s3Client: S3Client, fileUrl: string, destination: string) {
	const file = fs.createWriteStream(destination);
	const oFile = await s3Client.getObject(fileUrl);
	file.write(oFile.data);
}

export function formatS3Path(path: string) {
	path = path.trim();

	if (path) {
		if (path.startsWith("/")) {
			path = path.substr(1);
		}

		if (!path.endsWith("/")) {
			path = path + "/"
		}
	}
	return path;
}
