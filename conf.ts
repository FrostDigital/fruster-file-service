
import ms from "ms";

const s3Bucket = process.env.S3_BUCKET || "fruster-uploads";
const port = process.env.PORT ? Number.parseInt(process.env.PORT) : 3410;

export default {

	// NATS servers, set multiple if using cluster
	// Example: `["nats://10.23.45.1:4222", "nats://10.23.41.8:4222"]`
	bus: parseArray(process.env.BUS) || ["nats://localhost:4222"],

	// HTTP port
	port,

	// Name of S3 bucket
	s3Bucket,

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

	// Image proxy uri to be returned for proxied images
	proxyImageUrl: process.env.PROXY_IMAGE_URL || "http://localhost:" + port,

	serviceHttpUrl: process.env.DEIS_APP ? "http://" + process.env.DEIS_APP + "." + process.env.DEIS_APP : "http://localhost:" + port,

	// If to mock S3 and instead serve files locally, should only be used in test scenarios
	mockS3: process.env.MOCK_S3 === "true",

	// Custom S3 Endpoint if AWS is not used
	s3Endpoint: process.env.S3_ENDPOINT,

	// Number of thumbnails that will be extracted from uploaded video
	noOfThumbnails: Number.parseInt(process.env.NO_OF_THUMBNAILS || "0"),

	// If true any uploaded videos will not be encoded and just treated as any other file
	disableVideoEncoding: process.env.DISABLE_VIDEO_ENCODING === "true",

	// 1080 (FULL HD), 720 (HD), 480, 360, 240
	videoQuality: Number.parseInt(process.env.VIDEO_QUALITY || "480"),

	// Encodes/transcodes videos to provided format. Eg - mp4, webm. Defaults to keep same format as the when uploaded.
	videoFormat: process.env.VIDEO_FORMAT,

	// Base URI to S3 bucket from where videos can be downloaded directly
	videoBaseUri: process.env.AWS_VIDEO_BASE_URI || "https://s3-eu-west-1.amazonaws.com/" + s3Bucket
}



function parseArray(str?: string) {
	if (str) {
		return str.split(",");
	}
	return null;
}

function parseBool(str: string) {
	return str == "true" || parseInt(str) == 1;
}
