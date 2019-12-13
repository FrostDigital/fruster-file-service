const conf = require("../../conf");

const request = require("request");
const http = require(conf.imageBaseUri.includes("https") ? "https" : "http");
const fs = require("fs");
const sharp = require("sharp");
const log = require("fruster-log");
const uuid = require("uuid");
const fileType = require('file-type');

const InMemoryImageCacheRepo = require("../repos/InMemoryImageCacheRepo");
const S3Client = require("../clients/S3Client");
const constants = require("../constants");
const utils = require("../util/utils");

const CACHE_CONTROL_HEADER = "Cache-Control";

/**
 * Handler for getting proxied and resized images.
 * Supports height & width query to get resized versions of image.
 */
class GetImageHandler {

    /**
     * @param {InMemoryImageCacheRepo} inMemoryImageCacheRepo 
     */
    constructor(inMemoryImageCacheRepo) {
        this.repo = inMemoryImageCacheRepo;
        this.s3 = new S3Client();
    }

    /**
     * Handles getting proxied and resized images
     * 
     * @param {Request} req - http request
     * @param {Response} res - http response
     */
    async handle(req, res) {
        /**
         * Set HTTP cache control header on response, not that this will 
         * be unset in case of error response
         */
        res.set(CACHE_CONTROL_HEADER, "max-age=" + conf.cacheControlMaxAgeSec);

        /**
         * If no query provided we only get the image.
         */
        if (this._noQuery(req.query))
            return this._getImageByUrl(res, `${conf.imageBaseUri}/${req.params.imageName}`);

        /**
         * Cleans query to only allow what we want (e.g. height & width as numbers).
         */
        req.query = this._cleanQuery(req.query);

        /**
         * Checks in memory image cache repo if an url to the resized image exists.
         */
        const imageUrl = this.repo.get(req.params.imageName, {
            height: req.query.height,
            width: req.query.width
        });

        if (imageUrl) {
            /**
             * If url exists we fetch that image right away.
             */
            try {
                log.debug("Fetching URL from memory");
                this._getImageByUrl(res, imageUrl);
            } catch (err) {
                throw err;
            }
        } else {
            /**
             * Otherwise we prepare url to see if image exists in S3.
             */
            const fileName = utils.getImageFileNameFromQuery(req.params.imageName, req.query, "");

            try {
                /**
                 * If image exists we fetch that image.
                 */
                await this.s3.checkIfExists(fileName);
                this._getImageByUrl(res, `${conf.imageBaseUri}/${fileName}`);
                this.repo.add(req.params.imageName, req.query, `${conf.imageBaseUri}/${fileName}`);
            } catch (err) {
                /**
                 * Otherwise we resize the image
                 */
                await this._resizeImage(req, res);
            };
        }
    }

    /**
     * Rescales image.
     * 
     * @param {Request} req - http request
     * @param {Response} res - http response
     */
    async _resizeImage(req, res) {
        const maxTries = conf.maxImageUploadRetries;
        let resizedImageBuffer;
        let currentTry = 0;
        let postRequest;

        const operationId = `{{${uuid.v4()}}}`;
        const fileName = req.params.imageName;
        const fileNameWithQuery = utils.getImageFileNameFromQuery(fileName, req.query, operationId);
        let width = req.query.width ? Math.round(Number.parseInt(req.query.width)) : null;
        let height = req.query.height ? Math.round(Number.parseInt(req.query.height)) : null;

        if (width && width > conf.maxQueryRescaleSize)
            width = conf.maxQueryRescaleSize;

        if (height && height > conf.maxQueryRescaleSize)
            height = conf.maxQueryRescaleSize;

        try {
            /**
             * Gets the image for resizing and saves it to disc. 
             */
            await this._getImageForResizing(fileName, operationId);
            const readFile = await utils.readFile(`${constants.temporaryImageLocation}/${fileName}${operationId}`);
            const file = await fs.createWriteStream(`${constants.temporaryImageLocation}/${fileNameWithQuery}${operationId}`);

            /**
             * Rescales the image according to the initial query.
             */
            let resizeFile;

            const ft = fileType(readFile);

            /**
             * If buffer is something else than an image or has no file type (image not found)
             * return 404.
             */
            if (!this._isImage(ft)) {
                this._respondWithError(res, 404);

                await utils.removeFile(`${constants.temporaryImageLocation}/${fileName}${operationId}`);
                return;
            }

            /**
             * If buffer is image and everything correct, resize it.
             */
            resizeFile = sharp(readFile).resize(width, height);

            if (conf.proxyImagesQuality && conf.proxyImagesQuality <= 100 && conf.proxyImagesQuality > 0)
                resizeFile.toFormat(ft.ext, { quality: conf.proxyImagesQuality });

            resizeFile.pipe(file);
            resizedImageBuffer = await resizeFile.toBuffer();
            await resizeFile.end();

            res.end(resizedImageBuffer);

            /**
             * Sends resized image back to client before saving it to S3 (To speed up request)
             * And removes the original, unscaled, image file.
             */
            await utils.removeFile(`${constants.temporaryImageLocation}/${fileName}${operationId}`);

            try {
                /**
                 * Uploads the resized image to S3.
                 */
                await uploadResizedImage(this);
            } catch (err) {
                log.error(err);
            }

            await utils.removeFile(`${constants.temporaryImageLocation}/${fileNameWithQuery}${operationId}`);

        } catch (err) {
            this._respondWithError(res, 404);
            return;
        }

        /**
         * Uploads resized image to S3.
         * 
         * @param {Object} that - "this" of the class (To be used inside the Promsie-context). 
         * @param {Function=} lastResolve -resolve of last attempt (If attempting to upload image multiple times).
         */
        async function uploadResizedImage(that, lastResolve) {
            /**
             * Tries to upload resized image file to S3 {maxTries} times.
             */
            if (currentTry !== maxTries) {
                log.debug("trying to upload resized image, try " + (currentTry + 1));
                currentTry++;

                return new Promise((resolve, reject) => {
                    postRequest = request.post({
                        uri: conf.serviceHttpUrl + constants.endpoints.http.UPLOAD_RESIZED_IMAGE,
                        formData: {
                            file: fs.createReadStream(`${constants.temporaryImageLocation}/${fileNameWithQuery}${operationId}`)
                        },
                        timeout: 7000
                    }, async (err, resp, body) => {
                        postRequest.end();

                        if (err) {
                            log.error("Tried to save resized image to s3 but got: ", err);

                            /**
                             * If error occurs, we try again.
                             */
                            return await uploadResizedImage(that, lastResolve || resolve);
                        } else {
                            log.debug("Saved resized image to s3: ", req.params.imageName);
                            body = JSON.parse(body);

                            /**
                             * Adds uploaded resized image url to the in memory image cache repo.
                             */
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
                log.debug("was unable to upload resized image at this point");
                Promise.reject("");
            }
        }
    }

    /**
     * Checks if file is of type image.
     * 
     * @param {Object} fileType 
     */
    _isImage(fileType) {
        // @ts-ignore
        if (!fileType || !fileType.ext)
            return false;

        // @ts-ignore
        return ["jpg", "jpeg", "png", "gif", "tiff", "svg", "webp"].includes(fileType.ext.toLowerCase());
    }

    /**
     * Gets image by url.
     * 
     * @param {Response} res 
     * @param {String} url 
     */
    _getImageByUrl(res, url) {
        const getImageRequest = http.get(url, (response, error) => {
            getImageRequest.end();

            if (error || response.statusCode >= 400) {
                this._respondWithError(res, 404);
            } else {
                response
                    .pipe(res);
            }
        });
    }

    /**
     * Gets image and saves it to disc for image resizing.
     * 
     * @param {String} imageName 
     * @param {String} operationId 
     */
    _getImageForResizing(imageName, operationId) {
        const file = fs.createWriteStream(`${constants.temporaryImageLocation}/${imageName}${operationId}`);

        return new Promise((resolve, reject) => {
            const getRequest = http.get(`${conf.imageBaseUri}/${imageName}`, (response, error) => {
                getRequest.end();

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
     * Checks if request has any query (Any query we allow).
     * 
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
     * Cleans the query and parses values.
     * 
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

    /**
     * Sends error response and sets appropriate headers.
     * 
     * @param {Response} res 
     * @param {Number} statusCode 
     */
    _respondWithError(res, statusCode) {
        res.set(CACHE_CONTROL_HEADER, "max-age=0");
        res.status(statusCode);
        res.end();
    }

}

module.exports = GetImageHandler;