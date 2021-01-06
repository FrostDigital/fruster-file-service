import * as log from "fruster-log";
import { parseBusMessage } from "../util/utils";
import conf from "../../conf";
import constants from "../constants";
import { Request } from "express";

const errors = require("../errors");

interface UploadHttpRequest extends Request {
	file: Express.MulterS3.File;
	fileUploadError: Error;
}

class UploadFileHandler {

	/**
	 * @param {ExpRequest} req - http request
	 */
	async handle({ fileUploadError, file, headers }: UploadHttpRequest) {
		try {
			if (fileUploadError)
				throw fileUploadError;

			if (!file) {
				throw errors.get("BAD_REQUEST", "Missing field 'file'");
			}

			// The original bus message is passed as string in header "data"
			const busMessage = parseBusMessage(headers.data as string);

			const respBody = {
				status: 201,
				reqId: busMessage.reqId,
				transactionId: busMessage.transactionId,
				data: {
					url: file.location,
					key: file.key,
					originalName: file.originalname,
					mimeType: file.mimetype,
					size: file.size,
				}
			};

			log.silly(respBody);

			if (conf.proxyImages) {
				const proxyUrl = `${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName", respBody.data.key)}`;

				log.debug("Uploaded file", file.originalname, "->", file.location, "as", proxyUrl);

				// @ts-ignore
				respBody.data.amazonUrl = respBody.data.url;
				respBody.data.url = proxyUrl;
			} else {
				log.debug("Uploaded file", file.originalname, "->", file.location);
			}

			return respBody;
		} catch (err) {
			log.error("Got error while uploading file", err);
			throw errors.get("INTERNAL_SERVER_ERROR", "Something went wrong during upload, check service logs");
		}
	}

}

export default UploadFileHandler;
