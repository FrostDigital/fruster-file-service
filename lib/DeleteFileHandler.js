const aws = require('aws-sdk');
const FrusterRequest = require("fruster-bus").FrusterRequest;
const conf = require('../conf');
const log = require("fruster-log");
const errors = require('./errors.js');

class DeleteFileHandler {

    constructor() {

    }

    /**
     * Handle http request.
     * 
     * @param {FrusterRequest} req
     */
    async handle(req) {
        try {
            aws.config.update({
                accessKeyId: conf.awsAccessKeyId,
                secretAccessKey: conf.awsSecretAccessKey,
            });

            const s3 = new aws.S3();

            const params = {
                Bucket: conf.s3Bucket,
                Key: "f67f6d1d-61db-4b8e-b011-feda48366261.jpg"
            };

            s3.deleteObject(params, (err, data) => {
                if (err) console.log(err, err.stack); // an error occurred
                else {
                    console.log(data); // successful response
                }
            });

            return {
                status: 200,
                reqId: req.reqId
            };
        } catch (err) {
            log.error(err);
            throw errors.throw("INTERNAL_SERVER_ERROR");
        }
    }
}

module.exports = DeleteFileHandler;