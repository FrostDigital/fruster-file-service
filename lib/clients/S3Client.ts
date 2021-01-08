import S3, { ManagedUpload, ObjectIdentifierList } from "aws-sdk/clients/s3";
import AWS from "aws-sdk";
import * as log from "fruster-log";
import conf from "../../conf";
import https from "https";

const { s3Bucket, awsAccessKeyId, awsSecretAccessKey } = conf;
class S3Client {	

	s3 = new AWS.S3({
		accessKeyId: awsAccessKeyId,
		secretAccessKey: awsSecretAccessKey,
		sslEnabled: true,
		httpOptions: {
			agent: new https.Agent({ keepAlive: true })
		}
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

		return new Promise((resolve, reject) => {
			this.s3.headObject(params, (err, data) => {
				if (err) {
					log.debug(fileName, "does not exist");
					reject(false);
				} else {
					log.debug(fileName, "does exist");
					resolve(true);
				}
			});
		});
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
	async uploadFile(fileName: string, data: Buffer, mime?: string,): Promise<ManagedUpload.SendData> {
		const params: S3.Types.PutObjectRequest = {
			Bucket: s3Bucket,
			Key: fileName,
			ContentType: mime,
			Body: data,
			ACL: "public-read"
		};

		return new Promise((resolve, reject) => {
			this.s3.upload(params, function (err: Error, data: ManagedUpload.SendData) {
				if (err) reject(err);
				else resolve(data);
			});
		});
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

		return new Promise((resolve, reject) => {

			this.s3.getSignedUrl("getObject", params, (err, url) => { 
				if (err) {
					reject(err);
					return;
				}
				resolve(url);
			});

		});
	}

	/**
	 * Delete file from s3 bucket
	 *
	 * @param {String} file
	 *
	 * @returns {Promise}
	 */
	async deleteObject(file: string) {
		const params = {
			Bucket: s3Bucket,
			Key: file
		};

		return new Promise((resolve, reject) => {
			this.s3.deleteObject(params, (err, data) => {
				if (err) reject(err);
				else resolve(data);
			});
		});
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

		return new Promise((resolve, reject) => {
			this.s3.deleteObjects(params, (err, data) => {
				if (err) reject(err);
				else resolve(data);
			});
		});
	}
}

export default S3Client;