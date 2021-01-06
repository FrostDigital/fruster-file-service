import { Request, Response } from "express";
import * as log from 'fruster-log';
import conf from "../../conf";
import S3Client from '../clients/S3Client';
import FileManager from "../managers/FileManager";
import InMemoryImageCacheRepo from "../repos/InMemoryImageCacheRepo";
import { getImageFileNameFromQuery, httpOrHttps } from '../util/utils';

const CACHE_CONTROL_HEADER = "Cache-Control";

/**
 * Handler for getting proxied and processed images.
 * Supports height & width query to get processed versions of image.
 */
class GetImageHandler {
	repo: InMemoryImageCacheRepo;
	fileManager: FileManager;
	s3 = new S3Client();

	/**
	 * @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo
	 * @param {FileManager} fileManager
	 */
	constructor(inMemoryImageCacheRepo: InMemoryImageCacheRepo, fileManager: FileManager) {
		this.repo = inMemoryImageCacheRepo;
		this.fileManager = fileManager;		
	}

	/**
	 * Handles getting proxied and processed images
	 */
	async handle({ params: { imageName }, query: { height, width, angle } }: Request<{imageName:string}, any, {height: string, width: string, angle: string}>, res: Response) {
			
		const heightNum = this.parseNumberFromQuery(height);
		const widthNum = this.parseNumberFromQuery(width);
		const angleNum =  this.parseNumberFromQuery(angle);

		/**
		 * Set HTTP cache control header on response, not that this will
		 * be unset in case of error response
		 */
		res.set(CACHE_CONTROL_HEADER, "max-age=" + conf.cacheControlMaxAgeSec);

		/**
		 * If no query provided we only get the image.
		 */
		if (this._noQuery({ height: heightNum, width: widthNum, angle: angleNum }))
			return this._getImageByUrl(res, `${conf.imageBaseUri}/${imageName}`);

		/**
		 * Checks in memory image cache repo if an url to the processed image exists.
		 */
		const imageUrl = this.repo.get(imageName, { height: heightNum, width: widthNum, angle: angleNum });

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
			const fileName = getImageFileNameFromQuery(imageName, { height: heightNum, width: widthNum, angle: angleNum  });

			try {
				/**
				 * If image exists we fetch that image.
				 */
				await this.s3.checkIfExists(fileName);
				this._getImageByUrl(res, `${conf.imageBaseUri}/${fileName}`);
				this.repo.add(imageName, { height: heightNum, width: widthNum, angle: angleNum  }, `${conf.imageBaseUri}/${fileName}`);
			} catch (err) {
				/**
				 * Otherwise we process the image
				 */
				await this._processImage(imageName, heightNum, widthNum, angleNum, res);
			};
		}
	}

	private parseNumberFromQuery(value: any) {
		const str = Array.isArray(value) ? value[0] : value;
		return Number.parseFloat(str || "0");
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
	async _processImage(imageName:string, height:number, width:number, angle:number, res: Response) {
		let widthNum = width ? Math.round(width) : null;
		let heightNum = height ? Math.round(height) : null;

		if (widthNum && widthNum > conf.maxQueryRescaleSize)
			widthNum = conf.maxQueryRescaleSize;

		if (heightNum && heightNum > conf.maxQueryRescaleSize)
		heightNum = conf.maxQueryRescaleSize;

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
	_getImageByUrl(res: Response, url:string) {
		const getImageRequest = httpOrHttps.get(url, (response) => {
			getImageRequest.end();			
	
			if (response.statusCode && response.statusCode >= 400) {
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
	_noQuery({ height, width, angle }: {height: number, width: number, angle: number}) {
		if (!height && !width && !angle)
			return true;

		return (height <= 0 && width <= 0) || (angle <= 0 || angle >= 360);
	}

	/**
	 * Sends error response and sets appropriate headers.	
	 */
	_respondWithError(res: Response, statusCode:number) {
		res.set(CACHE_CONTROL_HEADER, "max-age=0");
		res.status(statusCode);
		res.end();
	}
}

export default  GetImageHandler;
