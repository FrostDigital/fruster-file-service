import ImageQuery from "../models/ImageQuery";
import uuid from "uuid";
import * as fs from "fs";
import constants from "../constants";
import fileType from 'file-type';
import conf from "../../conf";
import S3Client from "../clients/S3Client";
import { downloadFile, getImageFileNameFromQuery, isImage, readFile, removeFile } from "../util/utils";
import sharp from "sharp";
import * as log from 'fruster-log';

const errors = require('../errors.js');
const { temporaryImageLocation, endpoints } = constants;



class FileManager {

	s3 = new S3Client();
	
	/**
	 * Process image - resize, rotate
	 *
	 * @param {String} imageName
	 * @param {Object} query
	 *
	 * @returns {Promise<Object>}
	 */
	async processImage(imageName: string, query: ImageQuery) {
		const operationId = `{{${uuid.v4()}}}`;

		const tempFileLocation = `${temporaryImageLocation}/${imageName}${operationId}`;

		/**
		 * Download the file and use it to overwrite
		 */
		await downloadFile(`${conf.imageBaseUri}/${imageName}`, tempFileLocation);
		log.debug(`the image file is downloaded to - ${tempFileLocation}`);

		const tmpImage = await readFile(tempFileLocation);

		const ft = await fileType.fromBuffer(tmpImage);

		/**
		 * If buffer is something else than an image or has no file type (image not found)
		 */
		if (!isImage(ft?.ext)) {
			await removeFile(tempFileLocation);
			throw errors.throw("BAD_REQUEST");
		}

		//file name for new file
		const fileNameWithQuery = getImageFileNameFromQuery(imageName, query);
		const newFileLocation = `${temporaryImageLocation}/${fileNameWithQuery}${operationId}`;
		//write stream for new file
		const file = await fs.createWriteStream(newFileLocation);

		let updatedFile = sharp(tmpImage);

		// resize
		if (query.height || query.width)
			updatedFile = updatedFile.resize(query.width, query.height);

		// rotate
		if (query.angle)
			updatedFile = updatedFile.rotate(query.angle);

		// set image quality - default quality is setting, if not set proxyImagesQuality
		if (conf.proxyImagesQuality && conf.proxyImagesQuality <= 100 && conf.proxyImagesQuality > 0)
			updatedFile.toFormat(ft?.ext, { quality: conf.proxyImagesQuality });

		updatedFile.pipe(file);

		// use this buffer rather than reading updated file again
		const updatedImageBuffer = await updatedFile.toBuffer();

		await updatedFile.end();

		// upload updated file to s3
		const { Location, Key } = await this.s3.uploadFile(fileNameWithQuery, updatedImageBuffer, ft?.mime);

		log.debug(`File uploaded to ${Location}`);

		// remove the old file and updated file from local
		await removeFile(tempFileLocation);
		await removeFile(newFileLocation);

		const respBody: {amazonUrl: string, updatedImageBuffer: string, key: string, url?: string } = { amazonUrl: Location, key: Key, updatedImageBuffer };

		if (conf.proxyImages)
			respBody.url = `${conf.proxyImageUrl}${endpoints.http.GET_IMAGE.replace(":imageName", Key)}`;

		return respBody;
	}
}

export default FileManager;