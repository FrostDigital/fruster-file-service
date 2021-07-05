
import * as log from "fruster-log";
import { FrusterRequest, FrusterResponse } from "fruster-bus";
import { injectable, subscribe } from "fruster-decorators";

import S3Client from "../clients/S3Client";
import errors from "../errors";
import conf from "../../conf";
import { ListObjectResponse } from "../models/ListObjectsResponse";
import GetFilesResponse from "../../schemas/GetFilesResponse";

export const SERVICE_SUBJECT = `${conf.serviceName}.get-files`;

@injectable()
class GetFilesHandler {

	s3 = new S3Client();

	/**
	 * Handle service request.
	 *
	 * @param {FrusterRequest} req
	 */
	@subscribe({
		subject: SERVICE_SUBJECT,
		responseSchema: GetFilesResponse,
		docs: {
			description: "Get all files in the bucket",
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened.",
			}
		}
	})
	async handle({ }: FrusterRequest<void>): Promise<FrusterResponse<ListObjectResponse>> {
		let data: ListObjectResponse;

		try {
			data = await this.s3.getObjects();
		} catch (err) {
			log.error(err);
			throw errors.internalServerError();
		}

		return { status: 200, data };
	}
}

export default GetFilesHandler;
