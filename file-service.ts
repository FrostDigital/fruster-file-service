import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import expressFileupload from 'express-fileupload';
import bus from "fruster-bus";
import * as log from "fruster-log";
import * as fs from "fs";
import http from "http";
import conf from "./conf";
import constants from "./lib/constants";
import docs from "./lib/docs";
import errors from "./lib/errors";
import DeleteFilesHandler from "./lib/handlers/DeleteFilesHandler";
import GetFileByKeyHandler from "./lib/handlers/GetFileByKeyHandler";
import GetFilesHandler from "./lib/handlers/GetFilesHandler";
import GetImageHandler from "./lib/handlers/GetImageHandler";
import GetSignedUrlHandler from "./lib/handlers/GetSignedUrlHandler";
import IsProcessingCompletedHandler from "./lib/handlers/IsProcessingCompletedHandler";
import UpdateImageHandler from "./lib/handlers/UpdateImageHandler";
import UploadFileHandler from "./lib/handlers/UploadFileHandler";
import FileManager from "./lib/managers/FileManager";
import InMemoryImageCacheRepo from "./lib/repos/InMemoryImageCacheRepo";
import InMemoryVideoCacheRepo from "./lib/repos/InMemoryVideoCacheRepo";
import * as utils from "./lib/util/utils";


// TODO: Add process that cleans up temp files

const app = express();
const dateStarted = new Date();

export async function start(busAddress: string, httpServerPort: number) {
	/**
	 * Make sure the directory for temporary images exists.
	 */
	if (!fs.existsSync(constants.temporaryImageLocation)) {
		fs.mkdirSync(constants.temporaryImageLocation);
	}
	 if (!fs.existsSync(constants.temporaryVideoLocation)) {
		fs.mkdirSync(constants.temporaryVideoLocation);
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
							if (req.files && req.files.file && !Array.isArray(req.files.file)) {
								const reqDuration = Date.now() - startTime;
								const fileSizeKb = req.files.file.size / 1000;

								log.info(
									`${req.method} ${req.path} ${fileSizeKb ? fileSizeKb + " KB" : ""
									} -- ${res.statusCode} ${reqDuration}ms`
								);
							}

						});

						next();
					});

					app.use(bodyParser.urlencoded({ extended: false }));

					app.use(expressFileupload({
						limits: { fileSize: conf.maxFileSize * 1024 * 1024 },
						abortOnLimit: true,
						useTempFiles: true, // consider adding option for this
						limitHandler: (_req, res) => {
							return utils.sendError(
								res,
								errors.get("FILE_TOO_LARGE", conf.maxFileSize)
							);
						}
					}));

					registerHttpEndpoints();

					app.use((err: any, req: any, res: any, next: any) => {
						// Do not remove `next`, express will break!
						// Update from 2021: Nah, is that 👆 really true? /JS

						log.error(err);

						return utils.sendError(
							res,
							errors.internalServerError(err)
						);

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
		const inMemoryVideoCacheRepo = new InMemoryVideoCacheRepo();
		const fileManager = new FileManager(inMemoryVideoCacheRepo);

		const deleteFilesHandler = new DeleteFilesHandler();
		const updateImageHandler = new UpdateImageHandler(inMemoryImageCacheRepo, fileManager);

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
		new GetFilesHandler();
		new IsProcessingCompletedHandler();
	}

	function registerHttpEndpoints() {
		const inMemoryImageCacheRepo = new InMemoryImageCacheRepo();
		const inMemoryVideoCacheRepo = new InMemoryVideoCacheRepo();

		const fileManager = new FileManager(inMemoryVideoCacheRepo);

		const uploadFileHandler = new UploadFileHandler(fileManager);
		const getImageHandler = new GetImageHandler(inMemoryImageCacheRepo, fileManager);
		const getFileByKeyHandler = new GetFileByKeyHandler();

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

		app.post(constants.endpoints.http.UPLOAD_FILE, async (req, res) => {
			await uploadFileHandler.handle(req, res);
		});

		app.get(constants.endpoints.http.GET_IMAGE, async (req, res) => {
			try {
				// @ts-ignore
				await getImageHandler.handle(req, res);
			} catch (err) {
				res.set("Cache-Control", "max-age=0");
				res.end(JSON.stringify(err));
			}
		});

		app.get(constants.endpoints.http.GET_FILE, async (req, res) => {
			try {
				await getFileByKeyHandler.handleHttp(req, res);
			} catch (err) {
				res.set("Cache-Control", "max-age=0");
				res.end(JSON.stringify(err));
			}
		});

		app.get(constants.endpoints.http.HEALTH, (req, res) => {
			res.json({ status: "Alive since " + dateStarted });
		});
	}
}
