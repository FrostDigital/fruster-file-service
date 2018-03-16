const aws = require('aws-sdk');
const util = require('util');
const FrusterRequest = require("fruster-bus").FrusterRequest;
const conf = require('../conf');
const log = require("fruster-log");
const errors = require('./errors.js');
const s3Client = require("./s3-client");

class DeleteFileHandler {

    constructor() {
        this.s3 = s3Client.instance();
    }

    /**
     * Handle http request.
     * 
     * @param {FrusterRequest} req
     */
    async handle(req) {
        try {
            const file = this._getFileName(req.data.url);

            await this.s3.deleteObject(file);

            return {
                status: 200,
                reqId: req.reqId
            };
        } catch (err) {
            log.error(err);
            throw errors.throw("INTERNAL_SERVER_ERROR");
        }
    }

    /**
     * Get key from file URL
     * 
     * @param {String} url Eg: https://fruster-uploads.s3.amazonaws.com/58a9b179-89ec-4790-9fa9-16dca9e1a4f5.jpg 
     * 
     * @return {String} Eg: 58a9b179-89ec-4790-9fa9-16dca9e1a4f5.jpg 
     */
    _getFileName(url) {
        return url.match(/\/([^\/]+)\/?$/)[1];
    }
}

module.exports = DeleteFileHandler;