const conf = require("../conf");
const AWS = require("aws-sdk");
const ms = require("ms");
const log = require("fruster-log");
const https = require("https");

class S3Client {

	/**
	 * @param {String} bucket 
	 * @param {String} accessKey 
	 * @param {String} secretKey 
	 */
	constructor(bucket, accessKey, secretKey) {
		this.bucket = bucket || conf.s3Bucket;
		this.s3 = new AWS.S3({
			accessKeyId: accessKey || conf.awsAccessKeyId,
			secretAccessKey: secretKey || conf.awsSecretAccessKey,
			sslEnabled: true,
			httpOptions: {
				agent: new https.Agent({ keepAlive: true })
			}
		});
	}

	checkIfExists(imageName) {
		const params = {
			Bucket: this.bucket,
			Key: imageName
		};

		return new Promise((resolve, reject) => {
			this.s3.headObject(params, (err, data) => {
				if (err) {
					log.debug(imageName, "does not exist");
					reject(err);
				} else {
					log.debug(imageName, "does exist");
					resolve();
				}
			});
		});
	}

	/**
	 * @param {String} key 
	 * @param {Number} expires 
	 */
	getSignedUrl(key, expires = 60 * 1000) {
		const params = {
			Bucket: this.bucket,
			Key: key,
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
}

module.exports = {
	instance: (bucket, accessKey, secretKey) => new S3Client(bucket, accessKey, secretKey)
};