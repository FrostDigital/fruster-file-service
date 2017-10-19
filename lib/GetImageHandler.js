const conf = require("../conf");

const request = require("request");
const http = require(conf.imageBaseUri.includes("https") ? "https" : "http");
const fs = require("fs");
const sharp = require("sharp");
const log = require("fruster-log");
const uuid = require("uuid");

const InMemoryImageCacheRepo = require("./repo/InMemoryImageCacheRepo");
const s3Client = require("./s3-client");
const Request = require("../node_modules/express/lib/request.js");
const Response = require("../node_modules/express/lib/response.js");
const constants = require("./constants");
const utils = require("./util/utils");


class GetImageHandler {

    /**
     * @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo 
     */
    constructor(inMemoryImageCacheRepo) {
        this.repo = inMemoryImageCacheRepo;
        this.s3 = s3Client.instance();
    }

    /**
     * @param {Request} req - http request
     * @param {Response} res - http response
     */
    async handle(req, res) {
        if (this._noQuery(req.query))
            return this._getImageByUrl(res, `${conf.imageBaseUri}/${req.params.imageName}`);

        req.query = this._cleanQuery(req.query);

        const imageUrl = this.repo.get(req.params.imageName, { height: req.query.height, width: req.query.width });

        if (imageUrl) {
            try {
                log.debug("Fetching from memory");
                this._getImageByUrl(res, imageUrl);
            } catch (err) {
                throw err;
            }
        } else {
            const fileName = utils.getImageFileNameFromQuery(req.params.imageName, req.query, "");

            try {
                await this.s3.checkIfExists(fileName);
                this._getImageByUrl(res, `${conf.imageBaseUri}/${fileName}`);
                this.repo.add(req.params.imageName, req.query, `${conf.imageBaseUri}/${fileName}`);
            } catch (err) {
                await this._rescaleImage(req, res);
            };
        }
    }

    /**
     * @param {Request} req - http request
     * @param {Response} res - http response
     */
    async _rescaleImage(req, res) {
        const maxTries = 15;
        let resizedImageBuffer;
        let currentTry = 0;
        let postRequest;

        const operationId = `{{${uuid.v4()}}}`;
        const fileName = req.params.imageName;
        const fileNameWithQuery = utils.getImageFileNameFromQuery(fileName, req.query, operationId);
        const width = req.query.width ? Math.round(Number.parseInt(req.query.width)) : null;
        const height = req.query.height ? Math.round(Number.parseInt(req.query.height)) : null;

        try {
            await this._getImageForResizing(fileName, operationId);
            const readFile = await utils.readFile(`./images/${fileName}${operationId}`);
            const file = await fs.createWriteStream(`images/${fileNameWithQuery}${operationId}`);
            const resizeFile = sharp(readFile).resize(width, height);
            resizeFile.pipe(file);

            resizedImageBuffer = await resizeFile.toBuffer();

            res.end(resizedImageBuffer);

            await utils.removeFile(`./images/${fileName}${operationId}`);

            try {
                await uploadResizedImage(this);
            } catch (err) {
                log.error(err);
            }

            await utils.removeFile(`./images/${fileNameWithQuery}${operationId}`);

        } catch (err) {
            res.status(404);
            res.end();
        }

        /**
         * @param {Object} that - this
         * @param {Object=} lastResolve - this
         */
        async function uploadResizedImage(that, lastResolve) {
            if (currentTry != maxTries) {
                log.debug("trying to upload rescaled image, try " + currentTry);
                currentTry++;

                return new Promise((resolve, reject) => {

                    postRequest = request.post({
                        uri: conf.serviceHttpUrl + constants.endpoints.http.UPLOAD_RESIZED_IMAGE,
                        formData: {
                            file: fs.createReadStream(`images/${fileNameWithQuery}${operationId}`)
                        },
                        timeout: 1000
                    }, async (err, resp, body) => {
                        postRequest.end();

                        if (err) {
                            log.error("Tried to save rescaled image to s3 but got: ", err);
                            return await uploadResizedImage(that, resolve);
                        } else {
                            log.debug("Saved rescaled image to s3: ", req.params.imageName);
                            body = JSON.parse(body);
                            that.repo.add(req.params.imageName, req.query, body.data.amazonUrl);
                            if (lastResolve)
                                lastResolve();
                            else
                                resolve();
                        }
                    });

                });

            } else {
                postRequest.end();
                log.debug("was unable to upload rescaled image but returns it to client anyway");
                Promise.reject("");
            }
        }
    }

    /**
     * @param {Response} res 
     * @param {String} url 
     */
    _getImageByUrl(res, url) {
        http.get(url, (response, error) => {
            if (error) {
                res.status(404);
                res.end();
            } else {
                response
                    .pipe(res);
            }
        });
    }

    /**
     * @param {String} imageName 
     */
    _getImageForResizing(imageName, operationId) {
        const file = fs.createWriteStream(`images/${imageName}${operationId}`);

        return new Promise((resolve, reject) => {
            http.get(`${conf.imageBaseUri}/${imageName}`, (response, error) => {
                response
                    .pipe(file)
                    .on("close", () => {
                        file.end();
                        resolve(response);
                    });
            });
        });
    }

    /**
     * @param {Object} query 
     */
    _noQuery(query) {
        if (!query.height && !query.width)
            return true;
        else {
            let parsedHeight = Number.parseFloat(query.height);
            let parsedWidth = Number.parseFloat(query.width);
            return (parsedHeight <= 0 && parsedWidth <= 0);
        }
    }

    /**
     * @param {Object} query
     */
    _cleanQuery(query) {
        const cleanedQuery = Object.assign({}, query);

        if (query.height instanceof Array)
            query.height = query.height[0];

        if (query.width instanceof Array)
            query.width = query.width[0];

        return query;
    }

}

module.exports = GetImageHandler;