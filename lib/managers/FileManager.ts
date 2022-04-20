import fileType from "file-type";
import * as log from "fruster-log";
import * as fs from "fs";
import sharp from "sharp";
import { v4 } from "uuid";
import conf from "../../conf";
import S3Client from "../clients/S3Client";
import constants from "../constants";
import errors from "../errors";
import ImageQuery from "../models/ImageQuery";
import { downloadTempFile, formatS3Path, getImageFileNameFromQuery, isImage, readFile, removeFile } from "../util/utils";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { exec }  from "child_process";
import InMemoryVideoCacheRepo from "../repos/InMemoryVideoCacheRepo";
import bus from "fruster-bus";
import { UploadedFile } from "express-fileupload";


const { temporaryImageLocation, endpoints } = constants;

class FileManager {

	s3 = new S3Client();

	constructor(private inMemoryVideoCacheRepo: InMemoryVideoCacheRepo) {}

	/**
	 * Process image - resize, rotate
	 *
	 * @param {String} imageName
	 * @param {Object} query
	 *
	 * @returns {Promise<Object>}
	 */
	async processImage(imageName: string, query: ImageQuery) {
		const operationId = `{{${v4()}}}`;

		const tempFileLocation = `${temporaryImageLocation}/${imageName}${operationId}`;

		/**
		 * Download the file and use it to overwrite
		 */
		await downloadTempFile(this.s3, imageName, tempFileLocation);

		log.debug(`Image was downloaded to - ${tempFileLocation}`);

		const tmpImage = await readFile(tempFileLocation);

		const ft = await fileType.fromBuffer(tmpImage);

		/**
		 * If buffer is something else than an image or has no file type (image not found)
		 */
		if (!ft || !isImage(ft?.ext)) {
			// await removeFile(tempFileLocation);
			log.warn("Invalid/unknown mime type for image", ft);
			throw errors.badRequest("Invalid/unknown mime type for image");
		}

		//file name for new file
		const fileNameWithQuery = getImageFileNameFromQuery(imageName, query);
		const newFileLocation = `${temporaryImageLocation}/${fileNameWithQuery}${operationId}`;
		//write stream for new file
		const file = await fs.createWriteStream(newFileLocation);

		let updatedFile = sharp(tmpImage);

		// resize
		if (query.height || query.width)
			updatedFile = updatedFile.resize(query.width || null, query.height || null);

		// rotate
		if (query.angle)
			updatedFile = updatedFile.rotate(query.angle);

		// set image quality - default quality is setting, if not set proxyImagesQuality
		if (conf.proxyImagesQuality && conf.proxyImagesQuality <= 100 && conf.proxyImagesQuality > 0) {
			// @ts-ignore
			updatedFile.toFormat(ft.ext, { quality: conf.proxyImagesQuality });
		}

		updatedFile.pipe(file);

		// use this buffer rather than reading updated file again
		const updatedImageBuffer = await updatedFile.toBuffer();

		await updatedFile.end();

		// upload updated file to s3
		const { Location, Key } = await this.s3.uploadFile(fileNameWithQuery, updatedImageBuffer, ft.mime);

		log.debug(`File uploaded to ${Location}`);

		// remove the old file and updated file from local
		await removeFile(tempFileLocation);
		await removeFile(newFileLocation);

		const respBody: {
			amazonUrl: string,
			updatedImageBuffer: Buffer,
			key: string,
			url?: string,
			mime?: string
		} = {
			amazonUrl: Location,
			key: Key,
			updatedImageBuffer,
			mime: ft.mime
		};

		if (conf.proxyImages)
			respBody.url = `${conf.proxyImageUrl}${endpoints.http.GET_IMAGE.replace(":imageName", Key).replace("*", "")}`;

		return respBody;
	}

	/**
	 * Encodes/transcode the video and uploads to s3.
	 *
	 * The process might take some time, once finished a messages will be published
	 * on the bus so any other service can react on that.
	 */
	 processVideo(reqId: string, file: UploadedFile, pathPrefix = "") {
		const parsedFile = path.parse(file.name);
		const ext = conf.videoFormat ? `.${conf.videoFormat}` : parsedFile.ext;

		const outputFileName = `tra_${file.name.replace(parsedFile.ext, "")}${ext}`;

		const outputFile = `${constants.temporaryVideoLocation}/${outputFileName}`;

		const s3Key = formatS3Path(pathPrefix) + outputFileName;

		const url = `${conf.videoBaseUri}/${s3Key}`;

		exec(`ffmpeg -y -i ${file.tempFilePath} -vf scale="w='if(gt(a,1),-2,min(${conf.videoQuality},iw))':h='if(gt(a,1),min(${conf.videoQuality},ih),-2)" -vcodec libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -preset veryfast -tune fastdecode -crf 25 -c:a aac -b:a 128k -ac 2 ${outputFile}`, async (error, stdout, stderr) => {
			if (error)
				throw errors.internalServerError(error);

			// No error handle for stderr. Because ffmpeg outputs all of its logging data to stderr.

			log.debug(`Video transcode is finished for ${outputFileName}`);

			const data = fs.readFileSync(outputFile);

			const ft = await fileType.fromFile(outputFile);

			if (!ft) {
				log.warn("Invalid/unknown file type", file.name);
			}

			await this.s3.uploadFile(s3Key, Buffer.from(data), ft?.mime);

			log.debug(`${s3Key} is uploaded to s3`);

			if (!this.inMemoryVideoCacheRepo.add(file.name))
				fs.unlinkSync(file.tempFilePath);

			fs.unlinkSync(outputFile);

			log.debug(`${file.tempFilePath} and ${outputFile} is deleted from file service`);

			bus.publish(`${conf.serviceName}.process-completed`, {
				reqId,
				data: {
					url
				}
			});
		});

		return {
			location: url,
			key: outputFileName,
		};
	}

	/**
	 * Create thumbnails for the video
	 */
	 async createThumbnails(file: UploadedFile, pathPrefix = "") {
		const thumbnails: string[] = [];

		const folder = `${constants.temporaryImageLocation}/${file.name}`;
		// const inputFile = `${constants.temporaryVideoLocation}/${file.name}`;
		const ext = "png";
		const mime = "image/png";

		return new Promise((resolve, reject) => {
			ffmpeg(file.tempFilePath)
				.screenshots({
					count: conf.noOfThumbnails,
					folder,
					filename: `${file.name}-%s.${ext}`
				})
				.on("error", (err) => {
					log.error("Could not created thumbnails");
					reject(err);
				})
				.on("end", async () => {
					const files = fs.readdirSync(folder);

					for (const file of files) {
						const data = fs.readFileSync(`${folder}/${file}`);
						const s3Key = formatS3Path(pathPrefix) + file;

						const { Location, Key } = await this.s3.uploadFile(s3Key, Buffer.from(data), mime);

						if (conf.proxyImages)
							thumbnails.push(`${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName", Key)}`);
						else
							thumbnails.push(Location);

						fs.unlinkSync(`${folder}/${file}`);
					}

					log.debug(`${thumbnails.length} thumbnail(s) has been created.`);

					fs.rmdirSync(folder);

					if (!this.inMemoryVideoCacheRepo.add(file.name))
						fs.unlinkSync(file.tempFilePath);

					resolve(thumbnails);
				});
		});
	}
}

export default FileManager;
