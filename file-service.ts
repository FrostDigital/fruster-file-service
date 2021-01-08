import express from "express";
import * as log from "fruster-log";
import bus from "fruster-bus";
import * as fs from "fs";
import cors from "cors";
import bodyParser from "body-parser";
import conf from "./conf";
import * as utils from "./lib/util/utils";
import constants from "./lib/constants";
import docs from "./lib/docs";
import errors from "./lib/errors";

import UpdateImageHandler from "./lib/handlers/UpdateImageHandler";
import DeleteFilesHandler from "./lib/handlers/DeleteFilesHandler";
import GetImageHandler from "./lib/handlers/GetImageHandler";
import GetSignedUrlHandler from "./lib/handlers/GetSignedUrlHandler";
import UploadFileHandler from "./lib/handlers/UploadFileHandler";
import http from "http";
import FileManager from "./lib/managers/FileManager";
import InMemoryImageCacheRepo from "./lib/repos/InMemoryImageCacheRepo";
const upload = require("./upload-config");

const app = express();
const dateStarted = new Date();


export async function start(busAddress: string, httpServerPort: number) {
	/**
	 * Make sure the directory for temporary images exists.
	 */
	if (!fs.existsSync(constants.temporaryImageLocation)) {
		fs.mkdirSync(constants.temporaryImageLocation);
	}

	function startHttpServer() {
		return new Promise<void>((resolve, reject) => {
			http.createServer(app)
				.listen(httpServerPort)
				.on("error", reject)
				.on("listening", () => {
					log.info(
						"File service HTTP server started and listening on port " +
							httpServerPort
					);

					app.use(cors({ origin: conf.allowOrigin }));

					app.use((req, res, next) => {
						const startTime = Date.now();

						res.on("finish", () => {
							const reqDuration = Date.now() - startTime;
							const fileSizeKb =
								req.file && req.file.size
									? req.file.size / 1000
									: null;
							log.info(
								`${req.method} ${req.path} ${
									fileSizeKb ? fileSizeKb + " KB" : ""
								} -- ${res.statusCode} ${reqDuration}ms`
							);
						});

						next();
					});

					app.use(bodyParser.urlencoded({ extended: false }));

					app.use(
						bodyParser.json({ limit: conf.maxFileSize + "mb" })
					);

					registerHttpEndpoints();

					app.use((req, res, next) => {
						next();
					});

					app.use((err: any, req: any, res: any, next: any) => {
						// Do not remove `next`, express will break!
						log.error(err);

						if (err.code == "LIMIT_FILE_SIZE") {
							return utils.sendError(
								res,
								errors.get("FILE_TOO_LARGE", conf.maxFileSize)
							);
						} else {
							return utils.sendError(
								res,
								errors.internalServerError(err)								
							);
						}
					});

					resolve();
				});
		});
	}

	const connectToBus = async () => {
		await bus.connect(busAddress);
		registerBusEndpoints();
	};

	await startHttpServer();
	await connectToBus();

	function registerBusEndpoints() {
		const inMemoryImageCacheRepo = new InMemoryImageCacheRepo();
		const fileManager = new FileManager();

		const deleteFilesHandler = new DeleteFilesHandler();
		const updateImageHandler = new UpdateImageHandler(
			inMemoryImageCacheRepo,
			fileManager
		);

		bus.subscribe({
			subject: constants.endpoints.http.bus.HEALTH,
			forwardToHttp: `${conf.serviceHttpUrl}${constants.endpoints.http.HEALTH}`,
			docs: docs.http.HEALTH,
		});

		bus.subscribe({
			subject: constants.endpoints.http.bus.UPLOAD_FILE,
			responseSchema: constants.schemas.response.UPLOAD_FILE,
			forwardToHttp: `${conf.serviceHttpUrl}${constants.endpoints.http.UPLOAD_FILE}`,
			mustBeLoggedIn: conf.mustBeLoggedIn,
			docs: docs.http.UPLOAD_FILE,
		});

		bus.subscribe({
			subject: constants.endpoints.http.bus.UPDATE_IMAGE,
			requestSchema: constants.schemas.request.UPDATE_IMAGE,
			responseSchema: constants.schemas.response.UPDATE_IMAGE,
			docs: docs.http.UPDATE_IMAGE,
			mustBeLoggedIn: conf.mustBeLoggedIn,
			handle: (req: any) => updateImageHandler.handleHttp(req),
		});
		
		bus.subscribe({
			subject: constants.endpoints.service.DELETE_FILE,
			requestSchema: constants.schemas.request.DELETE_FILES,
			docs: docs.service.DELETE_FILE,
			handle: (req: any) => deleteFilesHandler.handle(req),
		});
		
		new GetSignedUrlHandler();		
	}

	function registerHttpEndpoints() {
		const inMemoryImageCacheRepo = new InMemoryImageCacheRepo();
		const fileManager = new FileManager();

		const uploadFileHandler = new UploadFileHandler();
		const getImageHandler = new GetImageHandler(
			inMemoryImageCacheRepo,
			fileManager
		);

		if (busAddress.includes("mock")) {
			/*
			 * For testing purposes, if InMemoryImageCacheRepo is passed on from test
			 * the references are lost along the way for some reason... 😱🤔
			 */

			app.get("/proxy-cache", async (req, res) => {
				try {
					res.status(200).json(inMemoryImageCacheRepo.getAllAsJson());
				} catch (err) {
					return utils.sendError(
						res,
						errors.get("INTERNAL_SERVER_ERROR", err)								
					);
				}
			});
		}

		app.post(
			constants.endpoints.http.UPLOAD_FILE,
			upload().single("file"),
			async (req, res) => {
				try {
					// @ts-ignore
					const resp = await uploadFileHandler.handle(req);

					res.status(resp.status).json(resp);
				} catch (err) {
					return utils.sendError(
						res,
						errors.get("FILE_NOT_PROVIDED", err)								
					);
				}
			}
		);

		app.get(constants.endpoints.http.GET_IMAGE, async (req, res) => {
			try {
				// @ts-ignore
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
