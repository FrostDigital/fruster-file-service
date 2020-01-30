const express = require("express");
const log = require("fruster-log");
const bus = require("fruster-bus");
const bodyParser = require("body-parser");
const http = require("http");
const fs = require("fs");

const cors = require("cors");
const app = express();
const conf = require("./conf");
const upload = require("./upload-config");
const uploadResizedImage = require("./upload-resized-image-config");
const dateStarted = new Date();
const utils = require("./lib/util/utils");
const constants = require("./lib/constants");
const docs = require("./lib/docs");
const deprecatedErrors = require("./errors");

const InMemoryImageCacheRepo = require("./lib/repos/InMemoryImageCacheRepo");
const FileManager = require("./lib/managers/FileManager");

const UploadFileHandler = require("./lib/handlers/UploadFileHandler");
const GetSignedUrlHandler = require("./lib/handlers/GetSignedUrlHandler");
const GetImageHandler = require("./lib/handlers/GetImageHandler");
const UpdateImageHandler = require("./lib/handlers/UpdateImageHandler");
const DeleteFilesHandler = require("./lib/handlers/DeleteFilesHandler");

module.exports = { start };

/**
 * @param {String} busAddress - nats bus address
 * @param {Number} httpServerPort - http server port
 */
async function start(busAddress, httpServerPort) {
	/**
	 * Make sure the directory for temporary images exists.
	 */
	if (!fs.existsSync(constants.temporaryImageLocation)) {
		fs.mkdirSync(constants.temporaryImageLocation);
	}

	function startHttpServer() {
		return new Promise((resolve, reject) => {

			http.createServer(app).listen(httpServerPort)
				.on("error", reject)
				.on("listening", () => {

					log.info("File service HTTP server started and listening on port " + httpServerPort);

					app.use(cors({ origin: conf.allowOrigin }));

					app.use((req, res, next) => {
						const startTime = Date.now();

						res.on("finish", () => {
							const reqDuration = Date.now() - startTime;
							const fileSizeKb = req.file && req.file.size ? req.file.size / 1000 : null;
							log.info(`${req.method} ${req.path} ${fileSizeKb ? fileSizeKb + " KB" : ""} -- ${res.statusCode} ${reqDuration}ms`);
						});

						next();
					});

					app.use(bodyParser.urlencoded({ extended: false }));

					app.use(bodyParser.json({ limit: conf.maxFileSize + "mb" }));

					registerHttpEndpoints();

					app.use((req, res, next) => { next(); });

					app.use((err, req, res, next) => { // Do not remove `next`, express will break!
						log.error(err);

						if (err.code == "LIMIT_FILE_SIZE") {
							return utils.sendError(res, deprecatedErrors.fileTooLarge(conf.maxFileSize));
						} else {
							return utils.sendError(res, deprecatedErrors.unknownError(err));
						}
					});

					resolve();
				});

		});
	}

	const connectToBus = async () => {
		await bus.connect(busAddress);
		registerBusEndpoints();
	}

	await startHttpServer();
	await connectToBus();

	function registerBusEndpoints() {
		const inMemoryImageCacheRepo = new InMemoryImageCacheRepo();
		const fileManager = new FileManager(inMemoryImageCacheRepo);

		const getSignedUrl = new GetSignedUrlHandler();
		const deleteFilesHandler = new DeleteFilesHandler();
		const updateImageHandler = new UpdateImageHandler(inMemoryImageCacheRepo, fileManager);

		bus.subscribe({
			subject: constants.endpoints.http.bus.HEALTH,
			forwardToHttp: `${conf.serviceHttpUrl}${constants.endpoints.http.HEALTH}`,
			docs: docs.http.HEALTH
		});

		bus.subscribe({
			subject: constants.endpoints.http.bus.UPLOAD_FILE,
			responseSchema: constants.schemas.response.UPLOAD_FILE,
			forwardToHttp: `${conf.serviceHttpUrl}${constants.endpoints.http.UPLOAD_FILE}`,
			mustBeLoggedIn: conf.mustBeLoggedIn,
			docs: docs.http.UPLOAD_FILE
		});

		bus.subscribe({
			subject: constants.endpoints.http.bus.UPDATE_IMAGE,
			requestSchema: constants.schemas.request.UPDATE_IMAGE,
			docs: docs.http.UPDATE_IMAGE,
			mustBeLoggedIn: conf.mustBeLoggedIn,
			handle: (req) => updateImageHandler.handleHttp(req)
		});

		bus.subscribe({
			subject: constants.endpoints.service.GET_SIGNED_URL,
			responseSchema: constants.schemas.response.GET_SIGNED_URL,
			handle: (req) => getSignedUrl.handle(req),
			docs: docs.service.GET_SIGNED_URL
		});

		bus.subscribe({
			subject: constants.endpoints.service.DELETE_FILE,
			requestSchema: constants.schemas.request.DELETE_FILES,
			docs: docs.service.DELETE_FILE,
			handle: (req) => deleteFilesHandler.handle(req)
		});

	}

	function registerHttpEndpoints() {
		const inMemoryImageCacheRepo = new InMemoryImageCacheRepo();
		const fileManager = new FileManager(inMemoryImageCacheRepo);

		const uploadFileHandler = new UploadFileHandler();
		const getImageHandler = new GetImageHandler(inMemoryImageCacheRepo, fileManager);

		if (busAddress.includes("mock")) {
			/*
			 * For testing purposes, if InMemoryImageCacheRepo is passed on from test
			 * the references are lost along the way for some reason... 😱🤔
			 */

			app.get("/proxy-cache", async (req, res) => {
				try {
					res.status(200).json(inMemoryImageCacheRepo.repo);
				} catch (err) {
					return utils.sendError(res, deprecatedErrors.unknownError());
				}
			});
		}

		app.post(constants.endpoints.http.UPLOAD_FILE, upload().single("file"), async (req, res) => {
			try {
				const resp = await uploadFileHandler.handle(req);

				res.status(resp.status).json(resp);
			} catch (err) {
				return utils.sendError(res, deprecatedErrors.fileNotProvided());
			}
		});

		if (conf.proxyImages) {
			app.post(constants.endpoints.http.UPLOAD_RESIZED_IMAGE, uploadResizedImage().single("file"), async (req, res) => {
				try {
					const resp = await uploadFileHandler.handle(req);

					res.status(resp.status).json(resp);
				} catch (err) {
					return utils.sendError(res, deprecatedErrors.fileNotProvided());
				}
			});
		}

		app.get(constants.endpoints.http.GET_IMAGE, async (req, res) => {
			try {
				await getImageHandler.handle(req, res);
			} catch (err) {
				res.end(JSON.stringify(err));
			}
		});

		app.get(constants.endpoints.http.HEALTH, (req, res) => {
			res.json({ status: "Alive since " + dateStarted });
		});

	}
}
