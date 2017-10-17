const conf = require("../conf");
const AWS = require("aws-sdk");
const ms = require("ms");

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
			secretAccessKey: secretKey || conf.awsSecretAccessKey
		});
	}

	checkIfExists(imageName) {
		const params = {
			Bucket: this.bucket,
			Key: imageName
		};

		return new Promise((resolve, reject) => {
			this.s3.headObject(params, function (err, data) {
				if (err) {
					reject();
				} else {
					console.log("\n");
					console.log("=======================================");
					console.log("data");
					console.log("=======================================");
					console.log(require("util").inspect(data, null, null, true));
					console.log("\n");

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
			Expires: ms(expires / 1000)
		};

		return new Promise((resolve, reject) => {

			this.s3.getSignedUrl("getObject", params, (err, url) => {
				if (err) {
					reject(err);
					return
				}
				resolve(url);
			});

		});
	}
}

module.exports = {
	instance: (bucket, accessKey, secretKey) => new S3Client(bucket, accessKey, secretKey)
};