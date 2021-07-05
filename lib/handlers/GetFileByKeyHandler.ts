import { Request, Response } from "express";

import S3Client from "../clients/S3Client";
import { S3 } from "aws-sdk";

class GetFileByKeyHandler {

	s3 = new S3Client();

	/**
	 * Handle http request.
	 */
	async handleHttp({ params: { fileKey } }: Request, res: Response) {
		const { data, mimetype } = await this.s3.getObject(fileKey);
		return this.sendResponse(res, data, mimetype);
	}

	private sendResponse(res: Response, data: S3.Body, mimetype?: string) {
		res.type(mimetype || "application/octet-stream");
		return res.send(data);
	}
}

export default GetFileByKeyHandler;
