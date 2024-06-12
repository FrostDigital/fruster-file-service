import AWS from "aws-sdk";
import S3, { ManagedUpload, ObjectIdentifierList } from "aws-sdk/clients/s3";
import * as log from "fruster-log";
import https from "https";
import mockAwsS3 from 'mock-aws-s3';
import conf from "../../conf";
import errors from "../errors";
import { ListObjectResponse } from "../models/ListObjectsResponse";

const { s3Bucket, awsAccessKeyId, awsSecretAccessKey } = conf;

// Mock S3 if tests
const TheS3Client = process.env.CI || conf.mockS3 ? mockAwsS3.S3 : AWS.S3;

if (process.env.CI) {
	log.warn("Running in mocked mode as CI is set, this should only be set when running tests")
}

class S3Client {

	s3 = new TheS3Client({
		accessKeyId: awsAccessKeyId,
		secretAccessKey: awsSecretAccessKey,
		sslEnabled: true,
		httpOptions: {
			agent: new https.Agent({ keepAlive: true })
		},
		// @ts-ignore
		endpoint : conf.s3Endpoint ? new AWS.Endpoint(conf.s3Endpoint) : undefined,
		region: conf.s3Region || undefined,
		s3ForcePathStyle: conf.s3ForcePathStyle || undefined
	});

	/**
	 * Check file is exist
	 *
	 * @param {String} fileName
	 *
	 * @returns {Promise}
	 */
	async checkIfExists(fileName: string) {
		const params = {
			Bucket: s3Bucket,
			Key: fileName
		};

		try {
			await this.s3.headObject(params).promise();
			log.debug(fileName, "does exist");
			return true;
		} catch (err) {
			log.debug(fileName, "does not exist");
			return false;
		}
	}

	/**
	 * Upload file to s3 bucket
	 *
	 * @param {String} fileName
	 * @param {String} mime
	 * @param {Buffer} data
	 *
	 * @returns {Promise<Object>}
	 */
	async uploadFile(fileName: string, data: Buffer, mime?: string): Promise<ManagedUpload.SendData> {
		const params: S3.Types.PutObjectRequest = {
			Bucket: s3Bucket,
			Key: fileName,
			ContentType: mime,
			Body: data,
			ACL: conf.s3Acl
		};

		return this.s3.upload(params).promise()
	}

	/**
	 * @param {String} key
	 * @param {Number} expires
	 *
	 * @returns {Promise}
	 */
	async getSignedUrl(key: string, expires = 60 * 1000) {
		const params = {
			Bucket: s3Bucket,
			Key: key,
			Expires: expires / 1000 // Note: AWS sets expires in seconds
		};

		// Note: Tempting to use getSignedUrlPromise, but not part of mock-aws-s3 so sticking to this
		return new Promise((resolve, reject) => this.s3.getSignedUrl("getObject", params, (err, url) => {
			if (err) {
				reject(err);
			}
			resolve(url);
		}));
	}

	/**
	 * Delete file from s3 bucket
	 *
	 * @param {String} file
	 *
	 * @returns {Promise}
	 */
	async deleteObject(file: string, version?: string) {
		const params = {
			Bucket: s3Bucket,
			Key: file,
			VersionId: version
		};

		return this.s3.deleteObject(params).promise();
	}

	/**
	 * Delete files from s3 bucket
	 *
	 * @param {Array<Object>} files
	 *
	 * @returns {Promise}
	 */
	async deleteObjects(files: ObjectIdentifierList) {
		const params: S3.Types.DeleteObjectsRequest = {
			Bucket: s3Bucket,
			Delete: {
				Objects: files,
				Quiet: false
			}
		};

		return this.s3.deleteObjects(params).promise();
	}

	async getObject(key: string) {
		try {
			const file = await this.s3.getObject({ Bucket: s3Bucket, Key: key }).promise();

			if (!file.Body) {
				throw new Error("Missing file body");
			}

			return {
				data: file.Body,
				mimetype: file.ContentType
			}
		} catch (err) {
			log.error("Failed to get object", err);
			throw errors.notFound(`File ${key} does not exist`);
		}
	}

	async getObjects(): Promise<ListObjectResponse> {
		try {
			const { Contents } = await this.s3.listObjects({ Bucket: s3Bucket, MaxKeys: 2000 }).promise();

			const files: { key: string }[] = [];

			Contents?.forEach(({ Key }) => {
				if (Key)
					files.push({ key: Key });
			});

			return { files };
		} catch (err) {
			log.error("Failed to get object", err);
			throw errors.internalServerError(err);
		}
	}

	/**
	 * This use only for unit tests
	 */
	async deleteBucket() {
		try {
			await this.s3.deleteBucket({ Bucket: s3Bucket }).promise();
		} catch (err) {
			throw errors.internalServerError(err);
		}
	}
}

export default S3Client;
