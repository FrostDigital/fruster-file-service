const FrusterRequest = require("fruster-bus").FrusterRequest;
const log = require("fruster-log");
const errors = require('../errors.js');
const utils = require("../util/utils");
const S3Client = require("../clients/S3Client");

class DeleteFilesHandler {

	constructor() {
		this.s3 = new S3Client();
	}

	/**
	 * Handle http request.
	 *
	 * @param {FrusterRequest} req
	 */
	async handle({ data }) {
		try {
			if (data.urls) {
				const files = data.urls.map(url => ({ Key: utils.getFileName(url) }));

				await this.s3.deleteObjects(files);
			} else {
				const file = utils.getFileName(data.url);

				await this.s3.deleteObject(file);
			}
		} catch (err) {
			log.error(err);
			throw errors.throw("INTERNAL_SERVER_ERROR");
		}

		return { status: 200 };
	}
}

module.exports = DeleteFilesHandler;
