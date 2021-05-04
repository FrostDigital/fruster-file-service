import FileManager from "../managers/FileManager";
import InMemoryImageCacheRepo from "../repos/InMemoryImageCacheRepo";
import { FrusterRequest, FrusterResponse } from "fruster-bus";
import path from "path";
import * as log from "fruster-log";
import conf from '../../conf';
import S3Client from "../clients/S3Client";
import { getImageFileNameFromQuery } from "../util/utils";
import constants from "../constants";
import errors from "../errors";


class UpdateImageHandler {

	s3 = new S3Client();

	repo: InMemoryImageCacheRepo;

	fileManager: FileManager;

	/**
	* @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo
	* @param {FileManager} fileManager
	*/
	constructor(inMemoryImageCacheRepo: InMemoryImageCacheRepo, fileManager: FileManager) {
		this.repo = inMemoryImageCacheRepo;
		this.fileManager = fileManager;
	}

	/**
	 * Handle http request.
	 *
	 * @param {FrusterRequest} req
	 */
	async handleHttp({ params: { imageName }, data }: FrusterRequest<any>): Promise<FrusterResponse<any>> {
		/**
		 * Checks in memory image cache repo if an url to the modified image exists.
		 */
		let amazonUrl = this.repo.get(imageName, data);

		let url, key;

		if (!amazonUrl) {
			/**
			 * Otherwise we prepare url to see if image exists in S3.
			 */
			const fileName = getImageFileNameFromQuery(imageName, data);

			amazonUrl = fileName;

			/**
			 * If image exists we fetch that image.
			 */
			if (await this.s3.checkIfExists(fileName)) {
				this.repo.add(imageName, data, fileName);
			} else {
				/**
				 * Otherwise update the image
				 */
				try {
					({ url, amazonUrl, key } = await this.fileManager.processImage(imageName, data));
					this.repo.add(imageName, data, amazonUrl);
				} catch (err) {
					log.error(err);
					throw errors.internalServerError();
				}
			}
		} else {
			if (!key) { //same image already exist in cache or s3
				key = path.basename(amazonUrl);

				if (conf.proxyImages)
					url = `${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName", key)}`;
			}
		}
		return { status: 200, data: { url, amazonUrl, key } };

	}
}

export default UpdateImageHandler;
