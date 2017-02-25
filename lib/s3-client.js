const AWS = require("aws-sdk");
const ms = require("ms");
const conf = require("../conf");

class S3Client {

	constructor(bucket, accessKey, secretKey) {
		this.bucket = bucket || conf.s3Bucket;
		this.s3 = new AWS.S3();
		
		AWS.config.update({
			accessKeyId: accessKey || conf.s3AccessKey,
			secretAccessKey: secretKey || conf.s3Secret
		});
	}

	getSignedUrl(key, expires = 60*1000) {		
		const params = {
			Bucket: this.bucket,
			Key: key,
			Expires: ms(expires)/1000
		};

		return new Promise((resolve, reject) => {

			this.s3.getSignedUrl("getObject", params, (err, url) => {
				if(err) {
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