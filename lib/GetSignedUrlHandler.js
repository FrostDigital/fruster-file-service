const conf = require("../conf");
const s3Client = require("./s3-client").instance();
const Request = require("../node_modules/express/lib/request.js");

class GetSignedUrlHandler {

    constructor() { }

    /**
     * @param {Request} req - http request
     */
    async handle(req) {
        const url = await s3Client.getSignedUrl(this._sanitizeFilePath(req.data.file), req.data.expires);
        const resp = { data: { url: url } };
        return resp;
    }


    /**
     * @param {String} filePath 
     */
    _sanitizeFilePath(filePath) {
        filePath = filePath.trim();

        if (filePath.indexOf("/") == 0) {
            return filePath.substr(1);
        }

        return filePath;
    }

}

module.exports = GetSignedUrlHandler;