import aws from "aws-sdk";
import { Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import { FrusterResponse } from "fruster-bus";
import * as log from "fruster-log";
import fs from "fs";
import mime from "mime-types";
import { v4 } from "uuid";
import conf from "../../conf";
import S3Client from "../clients/S3Client";
import constants from "../constants";
import errors from "../errors";
import FileManager from "../managers/FileManager";
import { formatS3Path, parseBusMessage, removeFile, sendError } from "../util/utils";
class UploadFileHandler {

	s3 = new S3Client();

	constructor(private fileManager: FileManager) {}

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

		if (file.size === 0) {
			return sendError(
				res,
				errors.get("FILE_NOT_PROVIDED", "File is empty (zero bytes)")
			);
		}

		const { path } = req.query;

		const isVideo = !conf.disableVideoEncoding && file.mimetype.includes("video/");

		if (isVideo) {
			return await this.processAndUploadVideo(file, req, res, path as string);
		} else {
			return this.uploadFile(file, req, res, path as string);
		}

	}

	private async processAndUploadVideo(file: UploadedFile, req: Request, res: Response, path?: string) {
		// The original bus message is passed as string in header "data"
		// This was populated by API gateway
		const busMessage = parseBusMessage(req.get("data"));

		let respBody: FrusterResponse<any> = {
			status: 201,
			reqId: busMessage.reqId,
			transactionId: busMessage.transactionId
		};

		const { location, key } = this.fileManager.processVideo(busMessage.reqId, file, path);

		respBody.data = {
			url: location,
			key
		}

		if (conf.noOfThumbnails > 0)
			respBody.data.thumbnails = await this.fileManager.createThumbnails(file, key, path);

		log.info(`Successfully queued encoding of video ${location}`);

		res.status(respBody.status).send(respBody);

	}

	private async uploadFile(file: UploadedFile, req: Request, res: Response, path?: string) {
		let uploadData: aws.S3.ManagedUpload.SendData;

		try {
			uploadData = await this.uploadToS3(file, path);
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
			const proxyUrl = `${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName*", respBody.data.key)}`;

			log.debug("Uploaded file", file.name, "->", uploadData.Location, "as", proxyUrl);

			// @ts-ignore
			respBody.data.amazonUrl = respBody.data.url;
			respBody.data.url = proxyUrl;
		} else {
			log.debug("Uploaded file", file.name, "->", uploadData.Location);
		}

		removeFile(file.tempFilePath);

		res.status(respBody.status).send(respBody);
	}

	private async uploadToS3(file: UploadedFile, path = ""): Promise<aws.S3.ManagedUpload.SendData> {
		const fileSplit = file.name.split('.');
		const fileExt = fileSplit.length > 1 ? fileSplit[fileSplit.length - 1] : mime.extension(file.mimetype);
		const filename = formatS3Path(path) + v4() + "." + fileExt;
		const data = fs.readFileSync(file.tempFilePath);

		try {
			return this.s3.uploadFile(filename, Buffer.from(data), file.mimetype);
		} catch (err) {
			log.error("Got error while uploading file to S3", err);
			return errors.internalServerError("Something went wrong when upload file");
		}
	}

}


export default UploadFileHandler;
