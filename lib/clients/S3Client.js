const AWS = require("aws-sdk");
const ms = require("ms");
const log = require("fruster-log");
const { s3Bucket, awsAccessKeyId, awsSecretAccessKey } = require("../../conf");
const https = require("https");

class S3Client {

	constructor() {
		this.bucket = s3Bucket;
		this.s3 = new AWS.S3({
			accessKeyId: awsAccessKeyId,
			secretAccessKey: awsSecretAccessKey,
			sslEnabled: true,
			httpOptions: {
				agent: new https.Agent({ keepAlive: true })
			}
		});
	}

	/**
	 * Check file is exist
	 *
	 * @param {String} fileName
	 *
	 * @returns {Promise}
	 */
	async checkIfExists(fileName) {
		const params = {
			Bucket: this.bucket,
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
	 * @param {String} key
	 * @param {Number} expires
	 *
	 * @returns {Promise}
	 */
	async getSignedUrl(key, expires = 60 * 1000) {
		const params = {
			Bucket: this.bucket,
			Key: key,
			//@ts-ignore
			Expires: ms(expires) / 1000
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
	async deleteObject(file) {
		const params = {
			Bucket: this.bucket,
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
	async deleteObjects(files) {
		const params = {
			Bucket: this.bucket,
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

module.exports = S3Client;
