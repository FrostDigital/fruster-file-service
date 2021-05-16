import { S3 } from "aws-sdk";
import { Request, Response } from "express";
import * as log from "fruster-log";
import conf from "../../conf";
import S3Client from "../clients/S3Client";
import errors from "../errors";
import FileManager from "../managers/FileManager";
import InMemoryImageCacheRepo from "../repos/InMemoryImageCacheRepo";
import { getImageFileNameFromQuery } from "../util/utils";

const CACHE_CONTROL_HEADER = "Cache-Control";

/**
 * Handler for getting proxied and processed images.
 * Supports height & width query to get processed versions of image.
 */
class GetImageHandler {
	repo: InMemoryImageCacheRepo;
	fileManager: FileManager;
	s3 = new S3Client();

	constructor(inMemoryImageCacheRepo: InMemoryImageCacheRepo, fileManager: FileManager) {
		this.repo = inMemoryImageCacheRepo;
		this.fileManager = fileManager;
	}

	/**
	 * Handles getting proxied and processed images
	 */
	async handle({ params: { imageName }, query: { height, width, angle } }: Request<{ imageName: string }, any, { height: string, width: string, angle: string }>, res: Response) {
		const heightNum = this.parseNumberFromQuery(height);
		const widthNum = this.parseNumberFromQuery(width);
		const angleNum = this.parseNumberFromQuery(angle);

		log.debug(`GET image ${imageName}, height: ${heightNum} width: ${widthNum} angle: ${angleNum}`);

		/**
		 * Set HTTP cache control header on response, note that this will
		 * be unset in case of error response
		 */
		res.set(CACHE_CONTROL_HEADER, "max-age=" + conf.cacheControlMaxAgeSec);

		/**
		 * If no query provided we only get the image from S3.
		 */
		if (this.noQuery({ height: heightNum, width: widthNum, angle: angleNum })) {
			const { data, mimetype } = await this.s3.getObject(imageName);
			return this.sendResponse(res, data, mimetype);
		}

		/**
		 * Checks in memory image cache repo if an url to the processed image exists.
		 */
		const imageUrl = this.repo.get(imageName, { height: heightNum, width: widthNum, angle: angleNum });

		if (imageUrl) {
			/**
			 * If url exists we fetch that image right away.
			 */
			try {
				log.debug("Fetching URL from memory", imageUrl);
				const { data, mimetype } = await this.s3.getObject(imageUrl);
				return this.sendResponse(res, data, mimetype);
			} catch (err) {
				throw err;
			}
		} else {
			/**
			 * Otherwise we prepare url to see if image exists in S3.
			 */
			const fileName = getImageFileNameFromQuery(imageName, { height: heightNum, width: widthNum, angle: angleNum });

			/**
			 * If processed image already exists at S3 we fetch that image.
			 */
			if (await this.s3.checkIfExists(fileName)) {
				const { data, mimetype } = await this.s3.getObject(fileName);
				this.sendResponse(res, data, mimetype);
				this.repo.add(imageName, { height: heightNum, width: widthNum, angle: angleNum }, fileName);
				return
			} else {
				/**
				 * Otherwise we process the image
				 */
				await this.processImage({imageName, height: heightNum, width: widthNum, angle: angleNum, fileName}, res);
			}
		}
	}

	private parseNumberFromQuery(value: any) {
		const str = Array.isArray(value) ? value[0] : value;
		return Number.parseFloat(str || "0");
	}

	/**
	 * Rescales and/or rotates image.
	 */
	private async processImage({imageName, height, width, angle, fileName}:{imageName: string, height: number, width: number, angle: number, fileName:string}, res: Response) {
		log.debug(`Processing image ${imageName}`);

		let widthNum = width ? Math.round(width) : null;
		let heightNum = height ? Math.round(height) : null;

		if (widthNum && widthNum > conf.maxQueryRescaleSize)
			widthNum = conf.maxQueryRescaleSize;

		if (heightNum && heightNum > conf.maxQueryRescaleSize)
			heightNum = conf.maxQueryRescaleSize;

		try {
			const { updatedImageBuffer, mime } = await this.fileManager.processImage(imageName, { height, width, angle });
			this.repo.add(imageName, { height, width, angle }, fileName);
			this.sendResponse(res, updatedImageBuffer, mime);
		} catch (err) {
			throw errors.notFound();
		}
	}

	/**
	 * Checks if request has any query (any query we allow).
	 */
	private noQuery({ height, width, angle }: { height: number, width: number, angle: number }) {
		if (width && width > 0)
			return false;
		else if (height && height > 0)
			return false;
		else if (angle && angle > 0 && angle < 360)
			return false;

		return true;
	}

	private sendResponse(res: Response, data: S3.Body, mimetype?: string) {
		res.type(mimetype || "application/octet-stream");
		return res.send(data);
	}

}

export default GetImageHandler;
