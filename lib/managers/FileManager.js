const uuid = require("uuid");
const request = require("request");
const fs = require("fs");
const sharp = require("sharp");
const FileType = require('file-type');
const log = require("fruster-log");
const config = require("../../conf");
const { endpoints, temporaryImageLocation } = require("../constants");
const errors = require('../errors.js');
const utils = require("../util/utils");
const InMemoryImageCacheRepo = require("../repos/InMemoryImageCacheRepo");


class FileManager {

	/**
	 * @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo
	 */
	constructor(inMemoryImageCacheRepo) {
		this._inMemoryImageCacheRepo = inMemoryImageCacheRepo;
	}

	/**
	 * Process image - resize, rotate
	 *
	 * @param {String} imageName
	 * @param {Object} query
	 *
	 * @returns {Promise<Object>}
	 */
	async processImage(imageName, query) {
		const operationId = `{{${uuid.v4()}}}`;

		const tempFileLocation = `${temporaryImageLocation}/${imageName}${operationId}`;

		/**
		 * Download the file and use it to overwrite
		 */
		await utils.downloadFile(`${config.imageBaseUri}/${imageName}`, tempFileLocation);
		log.debug(`the image file is downloaded to - ${tempFileLocation}`);

		const tmpImage = await utils.readFile(tempFileLocation);

		const ft = await FileType.fromBuffer(tmpImage);

		/**
		 * If buffer is something else than an image or has no file type (image not found)
		 */
		if (!utils.isImage(ft.ext)) {
			await utils.removeFile(tempFileLocation);
			throw errors.throw("BAD_REQUEST");
		}

		//file name for new file
		const fileNameWithQuery = utils.getImageFileNameFromQuery(imageName, query);
		const newFileLocation = `${temporaryImageLocation}/${fileNameWithQuery}${operationId}`;
		//write stream for new file
		const file = await fs.createWriteStream(newFileLocation);

		let updatedFile = tmpImage;

		// resize
		if (query.height || query.width)
			updatedFile = sharp(updatedFile).resize(query.width, query.height);

		// rotate
		if (query.angle)
			updatedFile = sharp(updatedFile).rotate(query.angle);

		// set image quality - default quality is setting, if not set proxyImagesQuality
		if (config.proxyImagesQuality && config.proxyImagesQuality <= 100 && config.proxyImagesQuality > 0)
			updatedFile.toFormat(ft.ext, { quality: config.proxyImagesQuality });

		updatedFile.pipe(file);

		// use this buffer rather than reading updated file again
		const updatedImageBuffer = await updatedFile.toBuffer();

		await updatedFile.end();

		// upload updated file to s3
		const imageUrl = await this._uploadFile(imageName, newFileLocation);

		// remove the old file and updated file from local
		await utils.removeFile(tempFileLocation);
		await utils.removeFile(newFileLocation);

		return { imageUrl, updatedImageBuffer };
	}

	/**
	 * Uploads image to S3.
	 *
	 * @param {String} imageName
	 * @param {String} newFileLocation
	 * @param {Function=} lastResolve
	 *
	 * @return {Promise<String>}
	 */
	async _uploadFile(imageName, newFileLocation, lastResolve) {
		let currentTry = 0;
		let postRequest;

		/**
		 * Tries to upload modified image file to S3 {config.maxImageUploadRetries} times.
		 */
		if (currentTry !== config.maxImageUploadRetries) {
			log.debug("trying to upload modified image, try " + (currentTry + 1));
			currentTry++;

			return new Promise((resolve) => {
				postRequest = request.post({
					uri: config.serviceHttpUrl + endpoints.http.UPLOAD_RESIZED_IMAGE,
					formData: { file: fs.createReadStream(newFileLocation) },
					timeout: 7000
				}, async (err, resp, body) => {
					postRequest.end();

					if (err) {
						log.error("Tried to save modified image to s3 but got: ", err);

						/**
						 * If error occurs, we try again.
						 */
						return await this._uploadFile(imageName, newFileLocation, lastResolve || resolve);
					} else {
						log.debug("Saved modified image to s3: ", imageName);
						body = JSON.parse(body);

						lastResolve ? lastResolve() : resolve(body.data.amazonUrl);
					}
				});
			});
		} else {
			//@ts-ignore
			postRequest.end();
			log.debug("was unable to upload resized image at this point");
			Promise.reject("");
		}
	}

}

module.exports = FileManager;
