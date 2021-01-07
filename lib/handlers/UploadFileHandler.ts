import * as log from "fruster-log";
import { parseBusMessage } from "../util/utils";
import conf from "../../conf";
import constants from "../constants";
import { Request } from "express";
import errors from "../errors";

interface UploadHttpRequest extends Request {
	file: Express.MulterS3.File;
	fileUploadError: Error;
}

class UploadFileHandler {
	
	async handle({ fileUploadError, file, headers }: UploadHttpRequest) {		
		if (fileUploadError) {
			log.error("Got error while uploading file", fileUploadError);			
			throw errors.internalServerError("Something went wrong when upload file");
		}

		if (!file) {
			throw errors.badRequest("Missing field 'file'");
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
	}

}

export default UploadFileHandler;
