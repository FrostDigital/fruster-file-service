import S3Client from "../clients/S3Client";
import * as log from "fruster-log";
import { FrusterRequest, FrusterResponse } from "fruster-bus";
import { getFileName } from "../util/utils";
import errors from "../errors";

//Similar with ObjectIdentifier in s3. But use lower case here to keep fruster variable consistency
type ObjectIdentifier = {
	key: string;
	version?: string;
}

type Request = {
	urls?: string[];
	url?: string;
	files?: ObjectIdentifier[];
	file?: ObjectIdentifier;
};

class DeleteFilesHandler {

	s3 = new S3Client();

	/**
	 * Handle http request.
	 *
	 * @param {FrusterRequest} req
	 */
	async handle({ data: { urls, url, files, file } }: FrusterRequest<Request>): Promise<FrusterResponse<void>> {
		try {
			if (urls) {
				const objects = urls.map(url => ({ Key: getFileName(url) }));

				await this.s3.deleteObjects(objects);
			} else if (url) {
				const key = getFileName(url);

				await this.s3.deleteObject(key);
			} else if (files) {
				await this.s3.deleteObjects(files.map(({ key, version }) => ({ Key: key, VersionId: version })));
			} else if (file) {
				await this.s3.deleteObject(file.key, file.version);
			}
		} catch (err) {
			log.error(err);
			throw errors.internalServerError(err);
		}

		return { status: 200 };
	}
}

export default DeleteFilesHandler;
