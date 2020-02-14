const path = require("path");
const FrusterRequest = require("fruster-bus").FrusterRequest;
const log = require("fruster-log");
const config = require("../../conf");
const errors = require('../errors.js');
const { endpoints } = require("../constants");
const utils = require("../util/utils");
const InMemoryImageCacheRepo = require("../repos/InMemoryImageCacheRepo");
const FileManager = require("../managers/FileManager");
const S3Client = require("../clients/S3Client");

class UpdateImageHandler {

	/**
	* @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo
	* @param {FileManager} fileManager
	*/
	constructor(inMemoryImageCacheRepo, fileManager) {
		this.repo = inMemoryImageCacheRepo;
		this.fileManager = fileManager;
		this.s3 = new S3Client();
	}

	/**
	 * Handle http request.
	 *
	 * @param {FrusterRequest} req
	 */
	async handleHttp({ params: { imageName }, data }) {
		/**
		 * Checks in memory image cache repo if an url to the modified image exists.
		 */
		let amazonUrl = this.repo.get(imageName, data);
		let url, key;

		if (!amazonUrl) {
			/**
			 * Otherwise we prepare url to see if image exists in S3.
			 */
			const fileName = utils.getImageFileNameFromQuery(imageName, data);

			try {
				/**
				 * If image exists we fetch that image.
				 */
				await this.s3.checkIfExists(fileName);

				amazonUrl = `${config.imageBaseUri}/${fileName}`;

				this.repo.add(imageName, data, amazonUrl);
			} catch (err) {
				/**
				 * Otherwise update the image
				 */
				try {
					({ url, amazonUrl, key } = await this.fileManager.processImage(imageName, data));
					this.repo.add(imageName, data, amazonUrl);
				} catch (err) {
					log.error(err);
					throw errors.throw("INTERNAL_SERVER_ERROR");
				}
			}
		}

		if (!key) { //same image already exist in cache or s3
			key = path.basename(amazonUrl);

			if (config.proxyImages)
				url = `${config.proxyImageUrl}${endpoints.http.GET_IMAGE.replace(":imageName", key)}`;
		}

		return { status: 200, data: { url, amazonUrl, key } };
	}
}

module.exports = UpdateImageHandler;
