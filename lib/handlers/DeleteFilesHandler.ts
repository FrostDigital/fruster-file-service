import S3Client from "../clients/S3Client";
import * as log from "fruster-log";
import { FrusterRequest, FrusterResponse } from "fruster-bus";
import { getFileName } from "../util/utils";
import errors from "../errors";

class DeleteFilesHandler {

	s3 = new S3Client();

	/**
	 * Handle http request.
	 *
	 * @param {FrusterRequest} req
	 */
	async handle({ data: { urls, url } 	}: FrusterRequest<{urls?: string[], url: string}>): Promise<FrusterResponse<void>> {			
		try {
			if (urls) {
				const files = urls.map(url => ({ Key: getFileName(url) }));

				await this.s3.deleteObjects(files);
			} else {
				const file = getFileName(url);

				await this.s3.deleteObject(file);
			}
		} catch (err) {
			log.error(err);
			throw errors.internalServerError();
		}

		return { status: 200 };
	}
}

export default DeleteFilesHandler;