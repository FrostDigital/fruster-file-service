const multerS3 = require('multer-s3');
const multer = require('multer');
const aws = require("aws-sdk");
const conf = require('./conf');

/**
 * Image config for updated images.
 * Uses original file name when uploading.
 */
const bucket = new aws.S3({
	accessKeyId: conf.awsAccessKeyId,
	secretAccessKey: conf.awsSecretAccessKey,
	params: {
		Bucket: conf.s3Bucket
	}
});

module.exports = () => {
	return multer({
		limits: {
			fileSize: conf.maxFileSize * 1024 * 1024
		},

		// Use S3 as storage, according to docs the upload should be streamed
		storage: multerS3({
			s3: bucket,
			bucket: conf.s3Bucket,
			acl: conf.s3Acl,
			contentType: multerS3.AUTO_CONTENT_TYPE,
			metadata: (req, file, cb) => {
				cb(null, { fieldName: file.fieldname });
			},
			key: (req, file, cb) => {
				const indexOfStart = file.originalname.indexOf("{{");
				const indexOfEnd = file.originalname.indexOf("}}");

				file.originalname = file.originalname.replace(file.originalname.substring(indexOfStart, 13 + indexOfEnd), "")

				cb(null, file.originalname);
			}
		})
	});
};
