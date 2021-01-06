import { FrusterRequest } from "fruster-bus";
import S3Client from "../clients/S3Client";

class GetSignedUrlHandler {

	s3 = new S3Client();

	
	async handle({ data: { file, expires } }: FrusterRequest<{file: string, expires: number}>) {
		return {
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
