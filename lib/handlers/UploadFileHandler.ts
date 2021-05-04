import aws from "aws-sdk";
import { Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import * as log from "fruster-log";
import mime from "mime-types";
import uuid from "uuid";
import conf from "../../conf";
import S3Client from "../clients/S3Client";
import constants from "../constants";
import errors from "../errors";
import { formatS3Path, parseBusMessage, sendError } from "../util/utils";

class UploadFileHandler {

	s3 = new S3Client();

	async handle(req: Request, res: Response) {
		const file = req.files?.file;

		if (!file) {
			return sendError(
				res,
				errors.get("FILE_NOT_PROVIDED", "Missing field 'file'")
			);
		}

		if (Array.isArray(file)) {
			log.error("Uploading multiple files is not (yet) supported");
			return sendError(res, {});
		}

		const { path } = req.query;

		let uploadData: aws.S3.ManagedUpload.SendData;

		try {
			uploadData = await this.uploadToS3(file, path ? path as string : "");
		} catch (err) {
			return sendError(res, err);
		}

		// The original bus message is passed as string in header "data"
		const busMessage = parseBusMessage(req.headers.data as string);

		const respBody = {
			status: 201,
			reqId: busMessage.reqId,
			transactionId: busMessage.transactionId,
			data: {
				url: uploadData.Location,
				key: uploadData.Key,
				originalName: file.name,
				mimeType: file.mimetype,
				size: file.size,
			}
		};

		log.silly(respBody);

		if (conf.proxyImages) {
			const proxyUrl = `${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName", respBody.data.key)}`;

			log.debug("Uploaded file", file.name, "->", uploadData.Location, "as", proxyUrl);

			// @ts-ignore
			respBody.data.amazonUrl = respBody.data.url;
			respBody.data.url = proxyUrl;
		} else {
			log.debug("Uploaded file", file.name, "->", uploadData.Location);
		}

		res.status(respBody.status).send(respBody);
	}

	private async uploadToS3(file: UploadedFile, path = ""): Promise<aws.S3.ManagedUpload.SendData> {
		const fileSplit = file.name.split('.');
		const fileExt = fileSplit.length > 1 ? fileSplit[fileSplit.length - 1] : mime.extension(file.mimetype);
		const filename = formatS3Path(path) + uuid.v4() + "." + fileExt;

		try {
			return this.s3.uploadFile(filename, file.data); // TODO: Is mime needed?
		} catch (err) {
			log.error("Got error while uploading file to S3", err);
			return errors.internalServerError("Something went wrong when upload file");
		}

	}

}


export default UploadFileHandler;
