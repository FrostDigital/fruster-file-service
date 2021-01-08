const multerS3 = require("multer-s3");
const multer = require("multer");
const aws = require("aws-sdk");
const uuid = require("uuid");
const mime = require("mime-types");
const conf = require("./conf").default;

/**
 * Config for files.
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
			cacheControl: "max-age=" + conf.cacheControlMaxAgeSec,
			metadata: (req, file, cb) => {
				cb(null, { fieldName: file.fieldname });
			},
			key: (req, file, cb) => {
				const fileSplit = file.originalname.split('.');
				const fileExt = fileSplit.length > 1 ? fileSplit[fileSplit.length - 1] : mime.extension(file.mimetype);

				cb(null, uuid.v4() + '.' + fileExt);
			}
		})
	});
};
