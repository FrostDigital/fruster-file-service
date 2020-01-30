const ms = require("ms");

const configExports = {

	// NATS servers, set multiple if using cluster
	// Example: `["nats://10.23.45.1:4222", "nats://10.23.41.8:4222"]`
	bus: parseArray(process.env.BUS) || ["nats://localhost:4222"],

	// HTTP port
	port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3410,

	// Name of S3 bucket
	s3Bucket: process.env.S3_BUCKET || "fruster-uploads",

	/**
	 * Allow origin for CORS
	 * Examples: `*`, `http://www.example.com`, `http://www.example.com,http://localhost:9000`
	 *
	 * Default: *
	 */
	allowOrigin: parseArray(process.env.ALLOW_ORIGIN) || "*",

	// AWS Access key id
	awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "AKIAJPEXVPNKCC2H35AQ",

	// AWS Secret access key
	awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET || "0KK41oXRPZItRrhuwh+Sd+cfq2EntJXN4UHZpNrq",

	// ACL for uploaded files, defaults to public-read which will make
	// uploaded files public
	s3Acl: process.env.S3_ACL || "public-read",

	// Max file size of uploaded files in mb
	maxFileSize: process.env.MAX_FILE_SIZE_MB ? Number.parseInt(process.env.MAX_FILE_SIZE_MB) : 5,

	// Name of service to use for all bus subjects
	serviceName: process.env.SERVICE_NAME || "file-service",

	// Whether or not you have to be logged in to upload image
	mustBeLoggedIn: parseBool(process.env.MUST_BE_LOGGED_IN || "false"),

	// Whether or not to proxy images uploaded
	proxyImages: parseBool(process.env.PROXY_IMAGES || "false"),

	// The percentage of quality from original. integer 1-100 (optional, default 80)
	proxyImagesQuality: process.env.PROXY_IMAGES_QUALITY ? Number.parseInt(process.env.PROXY_IMAGES_QUALITY) : null,

	maxImageUploadRetries: process.env.MAX_IMAGE_UPLOAD_RETRIES ? Number.parseInt(process.env.MAX_IMAGE_UPLOAD_RETRIES) : 3,

	maxQueryRescaleSize: process.env.MAX_QUERY_RESCALE_SIZE ? Number.parseInt(process.env.MAX_QUERY_RESCALE_SIZE) : 5000,

	// Cache control header set on uploaded files
	cacheControlMaxAgeSec: ms(process.env.CACHE_CONTROL_MAX_AGE || "24h") / 1000,
}

// Image base uri for where images are saved in aws
configExports.imageBaseUri = process.env.AWS_IMAGE_BASE_URI || "https://s3-eu-west-1.amazonaws.com/" + configExports.s3Bucket;

// Image proxy uri to be returned for proxied images
configExports.proxyImageUrl = process.env.PROXY_IMAGE_URL || "http://localhost:" + configExports.port;

configExports.serviceHttpUrl = process.env.DEIS_APP ? "http://" + process.env.DEIS_APP + "." + process.env.DEIS_APP : "http://localhost:" + configExports.port;

module.exports = configExports;


/**
 * @param {String} str - string to parse to array
 */
function parseArray(str) {
	if (str) {
		return str.split(",");
	}
	return null;
}

/**
 * @param {String} str - string to parse to boolean
 */
function parseBool(str) {
	return str == "true" || parseInt(str) == 1;
}
