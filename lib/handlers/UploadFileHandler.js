const log = require("fruster-log");
const utils = require("../util/utils");
const errors = require("../errors");
const { Request: ExpRequest } = require("../../node_modules/express/lib/request.js");
const conf = require("../../conf");
const constants = require("../constants");

class UploadFileHandler {

	/**
	 * @param {ExpRequest} req - http request
	 */
	async handle({ fileUploadError, file, headers }) {
		try {
			if (fileUploadError)
				throw fileUploadError;

			if (!file) {
				throw errors.get("BAD_REQUEST", "Missing field 'file'");
			}

			// The original bus message is passed as string in header "data"
			const busMessage = utils.parseBusMessage(headers.data);

			const respBody = {
				status: 201,
				reqId: busMessage.reqId,
				transactionId: busMessage.transactionId,
				data: {
					url: file.location,
					key: file.key,
					originalName: file.originalname,
					mimeType: file.mimetype,
					size: file.size
				}
			};

			log.silly(respBody);

			if (conf.proxyImages) {
				const proxyUrl = `${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName", respBody.data.key)}`;

				log.debug("Uploaded file", file.originalname, "->", file.location, "as", proxyUrl);

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

module.exports = UploadFileHandler;
