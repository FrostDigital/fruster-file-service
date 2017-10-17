const utils = require("./util/utils");
const errors = require("../errors");
const log = require("fruster-log");
const Request = require("../node_modules/express/lib/request.js");


class UploadFileHandler {

    /**
     * @param {Request} req - http request
     */
    async handle(req) {
        if (req.fileUploadError) {
            throw req.fileUploadError;
        }

        if (!req.file) {
            throw errors.fileNotProvided();
        }

        log.debug("Uploaded file", req.file.originalname, "->", req.file.location);

        // The original bus message is passed as string in header "data"
        const busMessage = utils.parseBusMessage(req.headers.data);

        const respBody = {
            status: 201,
            reqId: busMessage.reqId,
            transactionId: busMessage.transactionId,
            data: {
                url: req.file.location,
                key: req.file.key,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size
            }
        };

        log.silly(respBody);

        return {
            status: 201,
            reqId: busMessage.reqId,
            transactionId: busMessage.transactionId,
            data: {
                url: req.file.location,
                key: req.file.key,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size
            }
        };

    }

}

module.exports = UploadFileHandler;