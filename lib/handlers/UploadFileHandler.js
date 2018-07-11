const log = require("fruster-log");
const utils = require("../util/utils");
const errors = require("../errors");
const Request = require("../../node_modules/express/lib/request.js");
const conf = require("../../conf");
const constants = require("../constants");

class UploadFileHandler {

    /**
     * @param {Request} req - http request
     */
    async handle(req) {
        try {
            req = Object.assign({}, req);

            if (req.fileUploadError) {
                throw req.fileUploadError;
            }

            if (!req.file) {
                throw errors.fileNotProvided();
            }

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

            if (conf.proxyImages) {
                const proxyUrl = `${conf.proxyImageUrl}${constants.endpoints.http.GET_IMAGE.replace(":imageName", respBody.data.key)}`;

                log.debug("Uploaded file", req.file.originalname, "->", req.file.location, "as", proxyUrl);

                respBody.data.amazonUrl = respBody.data.url;
                respBody.data.url = proxyUrl;
            } else {
                log.debug("Uploaded file", req.file.originalname, "->", req.file.location);
            }

            return respBody;
        } catch (err) {
            throw errors.unknownError(err);
        }
    }

}

module.exports = UploadFileHandler;