const uuid = require("uuid");
const fs = require("fs");
const sharp = require("sharp");
const FileType = require('file-type');
const log = require("fruster-log");
const config = require("../../conf");
const { temporaryImageLocation, endpoints } = require("../constants");
const errors = require('../errors.js');
const utils = require("../util/utils");
const InMemoryImageCacheRepo = require("../repos/InMemoryImageCacheRepo");
const S3Client = require("../clients/S3Client");


class FileManager {

	/**
	 * @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo
	 */
	constructor(inMemoryImageCacheRepo) {
		this._inMemoryImageCacheRepo = inMemoryImageCacheRepo;
		this.s3 = new S3Client();
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
		const { Location, key } = await this.s3.uploadFile(fileNameWithQuery, updatedImageBuffer);

		log.debug(`File uploaded to ${Location}`);

		// remove the old file and updated file from local
		await utils.removeFile(tempFileLocation);
		await utils.removeFile(newFileLocation);

		const respBody = { amazonUrl: Location, key, updatedImageBuffer };

		if (config.proxyImages)
			respBody.url = `${config.proxyImageUrl}${endpoints.http.GET_IMAGE.replace(":imageName", key)}`;

		return respBody;
	}
}

module.exports = FileManager;
