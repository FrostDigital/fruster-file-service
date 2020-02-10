const FrusterRequest = require("fruster-bus").FrusterRequest;
const log = require("fruster-log");
const { imageBaseUri } = require("../../conf");
const errors = require('../errors.js');
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
		let imageUrl = this.repo.get(imageName, data);

		if (!imageUrl) {
			/**
			 * Otherwise we prepare url to see if image exists in S3.
			 */
			const fileName = utils.getImageFileNameFromQuery(imageName, data);

			try {
				/**
				 * If image exists we fetch that image.
				 */
				await this.s3.checkIfExists(fileName);

				imageUrl = `${imageBaseUri}/${fileName}`;

				this.repo.add(imageName, data, imageUrl);
			} catch (err) {
				/**
				 * Otherwise update the image
				 */
				try {
					({ imageUrl } = await this.fileManager.processImage(imageName, data));
					this.repo.add(imageName, data, imageUrl);
				} catch (err) {
					log.error(err);
					throw errors.throw("INTERNAL_SERVER_ERROR");
				}
			}
		}

		return { status: 200, data: { imageUrl } };
	}
}

module.exports = UpdateImageHandler;
