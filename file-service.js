const express = require("express");
const log = require("fruster-log");
const bus = require("fruster-bus");
const errors = require("./errors");
const bodyParser = require("body-parser");
const http = require("http");
const app = express();
const conf = require("./conf");
const upload = require("./upload-config");
const uploadResizedImage = require("./upload-resized-image-config");
const dateStarted = new Date();
const utils = require("./lib/util/utils");
const constants = require("./lib/constants");

const InMemoryImageCacheRepo = require("./lib/repo/InMemoryImageCacheRepo");
const UploadFileHandler = require("./lib/UploadFileHandler");
const GetSignedUrlHandler = require("./lib/GetSignedUrlHandler");
const GetImageHandler = require("./lib/GetImageHandler");


/**
 * @param {String} busAddress - nats bus address
 * @param {Number} httpServerPort - http server port
 */
function start(busAddress, httpServerPort) {

    const startHttpServer = new Promise((resolve, reject) => {

        http.createServer(app).listen(httpServerPort)
            .on("error", reject)
            .on("listening", () => {

                app.use(bodyParser.urlencoded({
                    extended: false
                }));
                app.use(bodyParser.json({
                    limit: conf.maxFileSize + "mb"
                }));

                registerHttpEndpoints();

                app.use((err, req, res, next) => { // Do not remove `next`, express will break!

                    if (err.code == "LIMIT_FILE_SIZE") {
                        return utils.sendError(res, errors.fileTooLarge(conf.maxFileSize));
                    } else {
                        return utils.sendError(res, errors.unknownError(err));
                    }

                });

                resolve();
            });

    });

    const connectToBus = async () => {
        await bus.connect(busAddress);
        registerBusEndpoints();
    }

    return startHttpServer.then(connectToBus);
}

function registerBusEndpoints() {
    const getSignedUrl = new GetSignedUrlHandler();

    bus.subscribe({
        subject: constants.endpoints.http.bus.HEALTH,
        forwardToHttp: `${conf.serviceHttpUrl}${constants.endpoints.http.HEALTH}`
    });

    bus.subscribe({
        subject: constants.endpoints.http.bus.UPLOAD_FILE,
        forwardToHttp: `${conf.serviceHttpUrl}${constants.endpoints.http.UPLOAD_FILE}`,
        mustBeLoggedIn: conf.mustBeLoggedIn
    });

    bus.subscribe(constants.endpoints.http.bus.GET_SIGNED_URL, (req) => getSignedUrl.handle(req));

}

function registerHttpEndpoints() {
    const inMemoryImageCacheRepo = new InMemoryImageCacheRepo();
    const uploadFileHandler = new UploadFileHandler();
    const getImageHandler = new GetImageHandler(inMemoryImageCacheRepo);

    app.post(constants.endpoints.http.UPLOAD_FILE, upload.single("file"), async (req, res) => {
        try {
            const resp = await uploadFileHandler.handle(req);

            res.status(resp.status).json(resp);
        } catch (err) {
            return utils.sendError(res, errors.fileNotProvided());
        }
    });

    app.post(constants.endpoints.http.UPLOAD_RESIZED_IMAGE, uploadResizedImage.single("file"), async (req, res) => {
        try {
            const resp = await uploadFileHandler.handle(req);

            res.status(resp.status).json(resp);
        } catch (err) {
            return utils.sendError(res, errors.fileNotProvided());
        }
    });

    app.get(constants.endpoints.http.GET_IMAGE, async (req, res) => {
        try {
            await getImageHandler.handle(req, res);
        } catch (err) {
            res.end(JSON.stringify(err));
        }
    });

    app.get(constants.endpoints.http.HEALTH, (req, res) => {
        res.json({
            status: "Alive since " + dateStarted
        });
    });

}

module.exports = {
    start
};