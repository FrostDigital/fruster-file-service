import { Response } from "express";
import * as log from "fruster-log";
import * as fs from "fs";
import S3Client from "../clients/S3Client";
import ImageQuery from "../models/ImageQuery";

/**
 * Sends an fruster error as a http response.
 */
export function sendError(res: Response, error: any) {
	log.error(error);
	res.status(error.status || 500).json(error);
}

/**
 * Parses bus message.
 */
export function parseBusMessage(str?: string) {
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
 * @param {String} fileKey
 * @param {String} destination
 *
 * @returns {Promise<Void>}
 */
export async function downloadTempFile(s3Client: S3Client, fileKey: string, destination: string) {
	makeDirRecursive( destination.split("/").slice(0,-1).join("/"));

	const file = fs.createWriteStream(destination);
	const oFile = await s3Client.getObject(fileKey);

	return new Promise<void>((resolve, reject) => {
        file.write(oFile.data, (err) => {
            if (err) {
                reject(err);
            } else {
                file.end(() => {
                    resolve();
                });
            }
        });

        file.on('error', (err) => {
            reject(err);
        });
    });
}


function makeDirRecursive(fullPath : string){
	const parts = fullPath.split("/");
	let path = "";
	parts.forEach((p)=>{
        if(p==="") return;
		path+="/" + p;
		if(!fs.existsSync(path)) fs.mkdirSync(path)
	})
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

export async function sleep(ms:number) {
	return new Promise(resolve => setTimeout(resolve, ms));

}
