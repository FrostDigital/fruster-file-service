const fs = require("fs");
const testUtils = require("fruster-test-utils");
const specUtils = require("./support/spec-utils");
const bus = require("fruster-bus");
const constants = require("../lib/constants");
const uuid = require("uuid");
const log = require("fruster-log");
const service = require("../file-service");

describe("Delete files", () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

    const httpPort = Math.floor(Math.random() * 6000 + 2000);
    const baseUri = `http://127.0.0.1:${httpPort}`;

    afterAll(() => {
        fs.readdir("./images", (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(`./images/${file}`, err => {
                    if (err) throw err;
                });
            }
        });
    });

    testUtils.startBeforeAll({
        mockNats: true,
        service: (connection) => service.start(connection.natsUrl, httpPort),
        bus: bus
    });

    it("should possible to delete a file from s3", async (done) => {
        try {

            const fileUploadResponse = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

            setTimeout(async () => {

                const deleteFileResponse = await bus.request({
                    subject: constants.endpoints.service.DELETE_FILE,
                    skipOptionsRequest: true,
                    message: {
                        reqId: uuid.v4(),
                        data: {
                            url: fileUploadResponse.body.data.url
                        }
                    }
                });

                expect(deleteFileResponse.status).toBe(200, "should be success");

                const fileResponse = await specUtils.get(fileUploadResponse.body.data.url);

                expect(fileResponse.statusCode).toBe(403, "file should delete"); //S3 give AccessDenied response rather than 404 

                done();

            }, 5000);
        } catch (err) {
            log.error(err);
            done.fail(err);
        }
    });

    it("should possible to delete a files from s3", async (done) => {
        try {

            const fileUploadResponse1 = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");
            const fileUploadResponse2 = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

            setTimeout(async () => {

                const deleteFileResponse = await bus.request({
                    subject: constants.endpoints.service.DELETE_FILE,
                    skipOptionsRequest: true,
                    message: {
                        reqId: uuid.v4(),
                        data: {
                            urls: [
                                fileUploadResponse1.body.data.url,
                                fileUploadResponse2.body.data.url
                            ]
                        }
                    }
                });

                expect(deleteFileResponse.status).toBe(200, "should be success");

                const fileResponse1 = await specUtils.get(fileUploadResponse1.body.data.url);

                expect(fileResponse1.statusCode).toBe(403, "file should delete"); //S3 give AccessDenied response rather than 404

                const fileResponse2 = await specUtils.get(fileUploadResponse2.body.data.url);

                expect(fileResponse2.statusCode).toBe(403, "file should delete"); //S3 give AccessDenied response rather than 404

                done();
            }, 5000);
        } catch (err) {
            log.error(err);
            done.fail(err);
        }
    });

    it("should throw error if file url not provide", async (done) => {
        try {

            await bus.request({
                subject: constants.endpoints.service.DELETE_FILE,
                skipOptionsRequest: true,
                message: {
                    reqId: uuid.v4(),
                    data: {
                        url: null
                    }
                }
            });

            done.fail();
        } catch (err) {
            expect(err.status).toBe(400);
            expect(err.error.code).toBe("BAD_REQUEST");
            done();
        }
    });

    it("should throw error if files url not provide", async (done) => {
        try {

            await bus.request({
                subject: constants.endpoints.service.DELETE_FILE,
                skipOptionsRequest: true,
                message: {
                    reqId: uuid.v4(),
                    data: {
                        urls: []
                    }
                }
            });

            done.fail();
        } catch (err) {
            expect(err.status).toBe(400);
            expect(err.error.code).toBe("BAD_REQUEST");
            done();
        }
    });

});