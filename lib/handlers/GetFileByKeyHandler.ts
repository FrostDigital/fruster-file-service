import { Request, Response } from "express";

import S3Client from "../clients/S3Client";
import { S3 } from "aws-sdk";

class GetFileByKeyHandler {

	s3 = new S3Client();

	/**
	 * Handle http request.
	 */
	async handleHttp({ params }: Request, res: Response) {
		// The route parameters is { '0': 'adfadf/fasdfa', slug: 'aaaa' } when I request /aaaa/adfadf/fasdfa . i don't know where the key '0' come from
		const fileKey = params.fileKey + params["0"];

		const { data, mimetype } = await this.s3.getObject(fileKey);
		return this.sendResponse(res, data, mimetype);
	}

	private sendResponse(res: Response, data: S3.Body, mimetype?: string) {
		res.type(mimetype || "application/octet-stream");
		return res.send(data);
	}
}

export default GetFileByKeyHandler;
