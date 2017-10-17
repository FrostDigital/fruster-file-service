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
     * @param {Response} res - http request
     */
    async handle(req, res) {
        if (this._noQuery(req.query))
            return this._getImageByUrl(res, `${conf.imageBaseUri}${req.params.imageName}`);

        req.query = this._cleanQuery(req.query);

        const imageUrl = this.repo.get(req.params.imageName, { height: req.query.height, width: req.query.width });

        if (imageUrl) {
            try {
                this._getImageByUrl(res, imageUrl);
            } catch (err) {
                throw err;
            }
        } else {
            try {
                const fileName = utils.getImageFileNameFromQuery(req.params.imageName, req.query);
                await this.s3.checkIfExists(fileName);
                this._getImageByUrl(res, `${conf.imageBaseUri}${fileName}`);
                this.repo.add(req.params.imageName, req.query, `${conf.imageBaseUri}${fileName}`);
            } catch (err) {
                await this._rescaleImage(req, res);
            }
        }
    }

    async _rescaleImage(req, res) {
        let resizedImageBuffer;
        let currentTry = 0;
        const maxTries = 2;

        const fileName = req.params.imageName;
        const width = req.query.width ? Number.parseInt(req.query.width) : null;
        const height = req.query.height ? Number.parseInt(req.query.height) : null;

        try {
            await this._getImageForResizing(fileName);

            const readFile = await this._readFile(`./images/${fileName}`);
            const file = fs.createWriteStream(`images/${utils.getImageFileNameFromQuery(fileName, req.query)}`);

            const resizeFile = sharp(readFile).resize(width, height);
            resizeFile.pipe(file);

            resizedImageBuffer = await resizeFile.toBuffer();

            await uploadResizedImage(this);
            await this._removeFile(`./images/${fileName}`);
            await this._removeFile(`images/${utils.getImageFileNameFromQuery(fileName, req.query)}`);

        } catch (err) {
            res.status(404);
            res.end();
        }


        function uploadResizedImage(that) {
            if (currentTry != maxTries) {
                log.debug("trying to upload rescaled image, try " + currentTry);
                currentTry++;

                return new Promise((resolve, reject) => {
                    request.post(conf.serviceHttpUrl + constants.endpoints.http.UPLOAD_RESIZED_IMAGE, {
                        formData: {
                            file: fs.createReadStream(`images/${utils.getImageFileNameFromQuery(fileName, req.query)}`)
                        }
                    }, (err, resp, body) => {

                        if (err) {
                            log.error("Tried to save rescaled image to s3 but got: ", err);
                            return uploadResizedImage(that);
                        } else {
                            log.debug("Saved rescaled image to s3: ", req.params.imageName);
                            body = JSON.parse(body);
                            that.repo.add(req.params.imageName, req.query, body.data.url);
                            res.end(resizedImageBuffer);
                            resolve();
                        }
                    });
                });

            } else {
                log.debug("was unable to upload rescaled image but returns it to client anyway");
                res.end(resizedImageBuffer);
            }
        }
    }

    _readFile(path) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, buffer) => {
                if (err)
                    reject(err);
                else
                    resolve(buffer);
            });
        });
    }

    _removeFile(path) {
        log.debug("removing file", path);
        return new Promise((resolve, reject) => {
            fs.unlink(path, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
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
    _getImageForResizing(imageName) {
        const file = fs.createWriteStream(`images/${imageName}`);

        return new Promise((resolve, reject) => {
            http.get(`${conf.imageBaseUri}${imageName}`, (response, error) => {
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
        return !query.height && !query.width;
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