const conf = require("../conf");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const log = require("fruster-log");
const fileService = require("../file-service");
const specUtils = require("./support/spec-utils");
const constants = require("../lib/constants");


describe("UploadFileHandler", () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    const httpPort = Math.floor(Math.random() * 6000 + 2000);
    const baseUri = `http://127.0.0.1:${httpPort}`;

    afterEach(() => conf.proxyImages = false);

    testUtils.startBeforeAll({
        mockNats: true,
        service: (connection) => fileService.start(connection.natsUrl, httpPort),
        bus: bus
    });

    it("should upload file to s3 bucket", async (done) => {
        try {
            const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

            expect(response.statusCode).toBe(201, "response.statusCode");
            expect(response.body.data.url).toContain("https://fruster-uploads", "response.body.data.url");
            expect(response.body.data.originalName).toBe("trump.jpg", "response.body.data.originalName");
            expect(response.body.data.key).toContain(".jpg", "response.body.data.key");

            done();
        } catch (err) {
            log.error(err);
            done.fail();
        }
    });

    it("should upload file to s3 bucket and proxy url if proxyImages config is set to true", async (done) => {
        conf.proxyImages = true;

        try {
            const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

            expect(response.statusCode).toBe(201, "response.statusCode");
            expect(response.body.data.url).toContain(conf.proxyImageUrl, "response.body.data.url");
            expect(response.body.data.originalName).toBe("trump.jpg", "response.body.data.originalName");
            expect(response.body.data.key).toContain(".jpg", "response.body.data.key");

            done();
        } catch (err) {
            log.error(err);
            done.fail();
        }
    });

    it("should upload file to s3 bucket and keep file extension from uploaded file", async (done) => {
        try {
            const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/random-file-format.fit");

            expect(response.statusCode).toBe(201, "response.statusCode");
            expect(response.body.data.url).toContain("https://fruster-uploads", "response.body.data.url");
            expect(response.body.data.originalName).toBe("random-file-format.fit", "response.body.data.originalName");
            expect(response.body.data.key).toContain(".fit", "response.body.data.key");

            done();
        } catch (err) {
            log.error(err);
            done.fail();
        }
    });

    it("should upload file to s3 bucket and set file extension from mimetype if no extension is set in file name", async (done) => {
        try {
            const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/file-without-extension");

            expect(response.statusCode).toBe(201, "response.statusCode");
            expect(response.body.data.url).toContain("https://fruster-uploads", "response.body.data.url");
            expect(response.body.data.originalName).toBe("file-without-extension", "response.body.data.originalName");
            expect(response.body.data.key).toContain(".bin", "response.body.data.key");

            done();
        } catch (err) {
            log.error(err);
            done.fail();
        }
    });

    it("should fail if no file was provided", async (done) => {
        try {
            const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, null);

            expect(response.statusCode).toBe(400, "response.statusCode");
            expect(response.body.status).toBe(400, "response.body.status");
            expect(response.body.error.title).toBe("No file provided", "response.body.error.title");

            done();
        } catch (err) {
            log.error(err);
            done.fail();
        }
    });

});

/** Since this is the only test that should have a small file size limit this has to be in its own describe */
xdescribe("UploadFileHandler pt. 2", () => {
    const httpPort = Math.floor(Math.random() * 6000 + 2000);
    const baseUri = `http://127.0.0.1:${httpPort}`;

    const fs = require("fs");
    const path = require("path");
    const directory = "./images";

    beforeAll(() => {
        conf.maxFileSize = 0.0001;
    });

    afterAll(() => {
        conf.maxFileSize = 5;
        conf.proxyImages = false;
    });

    testUtils.startBeforeAll({
        mockNats: true,
        service: (connection) => fileService.start(connection.natsUrl, httpPort),
        bus: bus
    });

    it("should fail to upload a large file", async (done) => {
        try {
            const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

            expect(response.statusCode).toBe(400, "response.statusCode");
            expect(response.body.status).toBe(400, "response.body.status");
            expect(response.body.error.title).toBe("File too large", "response.body.error.title");
            expect(response.body.error.detail).toBeDefined("response.body.error.detail");

            done();
        } catch (err) {
            log.error(err);
            done.fail();
        }
    });

});