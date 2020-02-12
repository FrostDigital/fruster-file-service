const conf = require("../../conf");

const { Request: ExpRequest } = require("../../node_modules/express/lib/request");
const { Response: ExpResponse } = require("../../node_modules/express/lib/response");
const http = require(conf.imageBaseUri.includes("https") ? "https" : "http");
const log = require("fruster-log");

const InMemoryImageCacheRepo = require("../repos/InMemoryImageCacheRepo");
const FileManager = require("../managers/FileManager");
const S3Client = require("../clients/S3Client");
const utils = require("../util/utils");

const CACHE_CONTROL_HEADER = "Cache-Control";

/**
 * Handler for getting proxied and resized images.
 * Supports height & width query to get resized versions of image.
 */
class GetImageHandler {

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
	 * Handles getting proxied and resized images
	 *
	 * @param {ExpRequest} req - http request
	 * @param {ExpResponse} res - http response
	 */
	async handle({ params: { imageName }, query: { height, width, angle } }, res) {
		/**
		 * Set HTTP cache control header on response, not that this will
		 * be unset in case of error response
		 */
		res.set(CACHE_CONTROL_HEADER, "max-age=" + conf.cacheControlMaxAgeSec);

		/**
		 * If no query provided we only get the image.
		 */
		if (this._noQuery({ height, width }))
			return this._getImageByUrl(res, `${conf.imageBaseUri}/${imageName}`);

		/**
		 * Cleans query to only allow what we want (e.g. height & width as numbers).
		 */
		({ height, width } = this._cleanQuery({ height, width }));

		/**
		 * Checks in memory image cache repo if an url to the resized image exists.
		 */
		const imageUrl = this.repo.get(imageName, { height, width, angle });

		if (imageUrl) {
			/**
			 * If url exists we fetch that image right away.
			 */
			try {
				log.debug("Fetching URL from memory");
				this._getImageByUrl(res, imageUrl);
			} catch (err) {
				throw err;
			}
		} else {
			/**
			 * Otherwise we prepare url to see if image exists in S3.
			 */
			const fileName = utils.getImageFileNameFromQuery(imageName, { height, width, angle });

			try {
				/**
				 * If image exists we fetch that image.
				 */
				await this.s3.checkIfExists(fileName);
				this._getImageByUrl(res, `${conf.imageBaseUri}/${fileName}`);
				this.repo.add(imageName, { height, width, angle }, `${conf.imageBaseUri}/${fileName}`);
			} catch (err) {
				/**
				 * Otherwise we resize the image
				 */
				await this._processImage(imageName, height, width, angle, res);
			};
		}
	}

	/**
	 * Rescales image.
	 *
	 * @param {String} imageName
	 * @param {*} height
	 * @param {*} width
	 * @param {*} angle
	 * @param {ExpResponse} res - http response
	 */
	async _processImage(imageName, height, width, angle, res) {
		width = width ? Math.round(Number.parseInt(width)) : null;
		height = height ? Math.round(Number.parseInt(height)) : null;
		angle = angle ? Math.round(Number.parseInt(angle)) : null;

		if (width && width > conf.maxQueryRescaleSize)
			width = conf.maxQueryRescaleSize;

		if (height && height > conf.maxQueryRescaleSize)
			height = conf.maxQueryRescaleSize;

		try {
			const { amazonUrl, updatedImageBuffer } = await this.fileManager.processImage(imageName, { height, width, angle });
			this.repo.add(imageName, { height, width, angle }, amazonUrl);
			res.end(updatedImageBuffer);
		} catch (err) {
			this._respondWithError(res, 404);
			return;
		}
	}

	/**
	 * Gets image by url.
	 *
	 * @param {Response} res
	 * @param {String} url
	 */
	_getImageByUrl(res, url) {
		const getImageRequest = http.get(url, (response, error) => {
			getImageRequest.end();

			if (error || response.statusCode >= 400) {
				this._respondWithError(res, 404);
			} else {
				response.pipe(res);
			}
		});
	}

	/**
	 * Checks if request has any query (Any query we allow).
	 *
	 * @param {Object} query
	 */
	_noQuery({ height, width }) {
		if (!height && !width)
			return true;

		let parsedHeight = Number.parseFloat(height);
		let parsedWidth = Number.parseFloat(width);

		return (parsedHeight <= 0 && parsedWidth <= 0);
	}

	/**
	 * Cleans the query and parses values.
	 *
	 * @param {Object} query
	 *
	 * @returns {Object}
	 */
	_cleanQuery({ height, width }) {
		if (height instanceof Array)
			height = height[0];

		if (width instanceof Array)
			width = width[0];

		return { height, width }
	}

	/**
	 * Sends error response and sets appropriate headers.
	 *
	 * @param {ExpResponse} res
	 * @param {Number} statusCode
	 */
	_respondWithError(res, statusCode) {
		res.set(CACHE_CONTROL_HEADER, "max-age=0");
		res.status(statusCode);
		res.end();
	}

}

module.exports = GetImageHandler;
