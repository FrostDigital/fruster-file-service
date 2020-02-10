const conf = require("../conf");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const fileService = require("../file-service");
const specUtils = require("./support/spec-utils");
const constants = require("../lib/constants");

describe("UploadFileHandler", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	let originalTimeout;
	beforeEach(() => {
		originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
	});

	afterEach(() => {
		conf.proxyImages = false;
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});

	testUtils.startBeforeAll({
		mockNats: true,
		service: (connection) => fileService.start(connection.natsUrl, httpPort),
		bus
	});

	it("should upload file to s3 bucket", async () => {
		const { statusCode, body: { data } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		expect(statusCode).toBe(201, "statusCode");
		expect(data.url).toContain("https://fruster-uploads", "data.url");
		expect(data.originalName).toBe("trump.jpg", "data.originalName");
		expect(data.key).toContain(".jpg", "data.key");
	});

	it("should upload file to s3 bucket and proxy url if proxyImages config is set to true", async () => {
		conf.proxyImages = true;

		const { statusCode, body: { data } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		expect(statusCode).toBe(201, "statusCode");
		expect(data.url).toContain(conf.proxyImageUrl, "data.url");
		expect(data.originalName).toBe("trump.jpg", "data.originalName");
		expect(data.key).toContain(".jpg", "data.key");
	});

	it("should upload file to s3 bucket and keep file extension from uploaded file", async () => {
		const { statusCode, body: { data } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/random-file-format.fit");

		expect(statusCode).toBe(201, "statusCode");
		expect(data.url).toContain("https://fruster-uploads", "data.url");
		expect(data.originalName).toBe("random-file-format.fit", "data.originalName");
		expect(data.key).toContain(".fit", "data.key");
	});

	it("should upload file to s3 bucket and set file extension from mimetype if no extension is set in file name", async () => {
		const { statusCode, body: { data } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/file-without-extension");

		expect(statusCode).toBe(201, "statusCode");
		expect(data.url).toContain("https://fruster-uploads", "data.url");
		expect(data.originalName).toBe("file-without-extension", "data.originalName");
		expect(data.key).toContain(".bin", "data.key");
	});

	it("should fail if no file was provided", async () => {
		const { statusCode, body: { status, error } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, null);

		expect(statusCode).toBe(400, "statusCode");
		expect(status).toBe(400, "status");
		expect(error.title).toBe("No file provided", "error.title");
	});

});

/** Since this is the only test that should have a small file size limit this has to be in its own describe */
xdescribe("UploadFileHandler pt. 2", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	const fs = require("fs");
	const path = require("path");
	const directory = "./images";

	beforeEach(() => {
		conf.maxFileSize = 0.0001;
	});

	afterEach(() => {
		conf.maxFileSize = 5;
		conf.proxyImages = false;
	});

	testUtils.startBeforeAll({
		mockNats: true,
		service: (connection) => fileService.start(connection.natsUrl, httpPort),
		bus: bus
	});

	it("should fail to upload a large file", async () => {
		const { statusCode, body: { status, error } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		expect(statusCode).toBe(400, "statusCode");
		expect(status).toBe(400, "status");
		expect(error.title).toBe("File too large", "error.title");
		expect(error.detail).toBeDefined("error.detail");
	});

});
