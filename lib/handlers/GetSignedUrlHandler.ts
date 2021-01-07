import { FrusterRequest } from "fruster-bus";
import { injectable, subscribe } from "fruster-decorators";
import conf from "../../conf";
import S3Client from "../clients/S3Client";
import constants from "../constants";

export const SUBJECT = `${conf.serviceName}.get-signed-url`;
@injectable()
class GetSignedUrlHandler {

	s3 = new S3Client();

	@subscribe({
		subject: SUBJECT,
		responseSchema: constants.schemas.response.GET_SIGNED_URL,
		docs: {
			description: "Gets an temporary url to a file that will expire after provided or default TTL",			
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened.",
				BAD_REQUEST: "Request has invalid or missing fields."
			}
		}
	})
	async handle({ data: { file, expires } }: FrusterRequest<{file: string, expires: number}>) {
		return {
			status: 200,
			data: {
				url: await this.s3.getSignedUrl(this._sanitizeFilePath(file), expires)
			}
		};
	}

	_sanitizeFilePath(filePath: string) {
		filePath = filePath.trim();

		if (filePath.includes("http://") || filePath.includes("https://")) {
			filePath = filePath.replace("http://", "").replace("https://", "");
			return filePath.substr(filePath.indexOf("/") + 1);
		}

		if (filePath.indexOf("/") === 0)
			return filePath.substr(1);

		return filePath;
	}

}

export default GetSignedUrlHandler;
