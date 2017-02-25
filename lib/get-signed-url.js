const conf = require("../conf");
const s3Client = require("./s3-client").instance();

module.exports = (req) => {

	return s3Client.getSignedUrl(sanitizeFilePath(req.data.file), req.data.expires)
		.then(url => {
			const resp = {
				data: { url: url }
			};
			return resp;
		});

};

function sanitizeFilePath(filePath) {
	filePath = filePath.trim();

	if(filePath.indexOf("/") == 0) {
		return filePath.substr(1);
	}

	return filePath;
}