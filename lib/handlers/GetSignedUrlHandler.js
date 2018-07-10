const S3Client = require("../clients/S3Client");
const Request = require("../../node_modules/express/lib/request.js");

class GetSignedUrlHandler {

    constructor() {
        this.s3 = new S3Client();
    }

    /**
     * @param {Request} req - http request
     */
    async handle(req) {
        return {
            data: {
                url: await this.s3.getSignedUrl(this._sanitizeFilePath(req.data.file), req.data.expires)
            }
        };
    }

    /**
     * 
     * @param {String} filePath 
     */
    _sanitizeFilePath(filePath) {
        filePath = filePath.trim();

        if (filePath.includes("http://") || filePath.includes("https://")) {
            filePath = filePath.replace("http://", "").replace("https://", "");
            return filePath.substr(filePath.indexOf("/") + 1);
        }

        if (filePath.indexOf("/") === 0) {
            return filePath.substr(1);
        }

        return filePath;
    }

}

module.exports = GetSignedUrlHandler;