import { FrusterRequest } from "fruster-bus";
import { injectable, subscribe } from 'fruster-decorators';
import conf from "../../conf";
import IsProcessingCompletedRequest from "../../schemas/IsProcessingCompletedRequest";
import IsProcessingCompletedResponse from "../../schemas/IsProcessingCompletedResponse";
import S3Client from "../clients/S3Client";
import { getFileName } from "../util/utils";
import log from "fruster-log";

export const SUBJECT = `${conf.serviceName}.is-processing-completed`;

/**
 * Use for getting a video processing is completed or not
 */
@injectable()
class IsProcessingCompletedHandler {

	s3 = new S3Client();

	 @subscribe({
		subject: SUBJECT,
		requestSchema: IsProcessingCompletedRequest,
		responseSchema: IsProcessingCompletedResponse,
		docs: {
			description: "Check whether the video file processing is completed or not",
		}
	})
	async handle({ data: { url } }: FrusterRequest<{ url: string }>) {
		try {
			const file = getFileName(url);

			return {
				status: 200,
				data: {
					finished: await this.s3.checkIfExists(file)
				}
			}
		} catch (err) {
			if (err === false) {
				return {
					status: 200,
					data: {
						finished: false
					}
				}
			}

			log.error(err);
			throw err;
		}
	}

}

export default IsProcessingCompletedHandler;
