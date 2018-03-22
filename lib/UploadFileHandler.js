const log = require("fruster-log");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const utils = require("./util/utils");
const errors = require("../errors");
const s3Client = require("./s3-client");
const Request = require("../node_modules/express/lib/request.js");
const conf = require("../conf");
const constants = require("./constants");

class UploadFileHandler {

    constructor() {
        this.s3 = s3Client.instance();
    }

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

            if (conf.needThumbnails) {
                respBody.data.thumbnails = await this.createThumbnails(respBody.data.url, respBody.data.key);
            }

            return respBody;
        } catch (err) {
            throw errors.unknownError(err);
        }
    }

    /**
     * Create thumbnails for videos
     * 
     * @param {String} url 
     * @param {String} key 
     * 
     * @returns {Promise}
     */
    async createThumbnails(url, key) {
        const thumbnails = [];

        const folder = `${constants.temporaryImageLocation}/${key}`;

        return new Promise((resolve, reject) => {
            ffmpeg(url)
                .screenshots({
                    count: conf.noOfThumbnails,
                    folder: folder,
                    filename: `${key}-%s.png`
                })
                .on("error", (err) => {
                    log.error("Could not created thumbnails");
                    reject(err);
                })
                .on("end", async () => {
                    fs.readdir(folder, async (err, files) => {
                        await Promise.all(files.map(async (file) => {
                            const res = await this.s3.uploadFile(folder, file);
                            thumbnails.push(res.Location);

                            fs.unlinkSync(`${folder}/${file}`);
                        }));

                        log.debug(`${thumbnails.length} thumbnails are created.`);

                        fs.rmdirSync(folder);

                        resolve(thumbnails);
                    });
                });
        });
    }

}

module.exports = UploadFileHandler;