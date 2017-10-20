process.env.MAX_FILE_SIZE_MB = 0.1;

const request = require("request");
const fs = require("fs");
const conf = require("../conf");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const fileService = require("../file-service");
const specUtils = require("./support/spec-utils");

// TODO: this test should be named UploadFileHandler.spec.js but for some reason it fails if it does 🤔
describe("file-upload", () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    const httpPort = Math.floor(Math.random() * 6000 + 2000);
    const baseUri = `http://127.0.0.1:${httpPort}`;

    afterEach((done) => {
        conf.proxyImages = false;
        done();
    });

    testUtils.startBeforeAll({
        mockNats: true,
        service: (connection) => fileService.start(connection.natsUrl, httpPort),
        bus: bus
    });

    it("should upload file to s3 bucket", (done) => {
        specUtils.post(baseUri, "/upload", "trump.jpg", (error, response, body) => {
            expect(response.statusCode).toBe(201);
            expect(body.data.url).toContain("https://fruster-uploads");
            expect(body.data.originalName).toBe("trump.jpg");
            expect(body.data.key).toContain(".jpg");
            done();
        });
    });

    it("should upload file to s3 bucket and proxy url if proxyImages config is set to true", (done) => {
        conf.proxyImages = true;

        specUtils.post(baseUri, "/upload", "trump.jpg", (error, response, body) => {
            expect(response.statusCode).toBe(201);
            expect(body.data.url).toContain(conf.proxyImageUrl);
            expect(body.data.originalName).toBe("trump.jpg");
            expect(body.data.key).toContain(".jpg");
            done();
        });
    });

    it("should upload file to s3 bucket and keep file extension from uploaded file", (done) => {
        specUtils.post(baseUri, "/upload", "random-file-format.fit", (error, response, body) => {
            expect(response.statusCode).toBe(201);
            expect(body.data.url).toContain("https://fruster-uploads");
            expect(body.data.originalName).toBe("random-file-format.fit");
            expect(body.data.key).toContain(".fit");
            done();
        });
    });

    it("should upload file to s3 bucket and set file extension from mimetype if no extension is set in file name", (done) => {
        specUtils.post(baseUri, "/upload", "file-without-extension", (error, response, body) => {
            expect(response.statusCode).toBe(201);
            expect(body.data.url).toContain("https://fruster-uploads");
            expect(body.data.originalName).toBe("file-without-extension");
            expect(body.data.key).toContain(".bin");
            done();
        });
    });

    it("should fail if no file was provided", (done) => {
        specUtils.post(baseUri, "/upload", null, (error, response, body) => {
            expect(response.statusCode).toBe(400);
            expect(body.status).toBe(400);
            expect(body.error.title).toBe("No file provided");
            done();
        });
    });

    it("should fail to upload a large file", (done) => {
        specUtils.post(baseUri, "/upload", "large-image.jpg", (error, response, body) => {
            expect(response.statusCode).toBe(400);
            expect(body.status).toBe(400);
            expect(body.error.title).toBe("File too large");
            expect(body.error.detail).toBeDefined();
            done();
        });
    });

});