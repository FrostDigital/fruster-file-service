const testUtils = require("fruster-test-utils");
const specUtils = require("./support/spec-utils");
const bus = require("fruster-bus");
const constants = require("../lib/constants");
const uuid = require("uuid");
const log = require("fruster-log");
const service = require("../file-service");

fdescribe("Delete file", () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

    const httpPort = Math.floor(Math.random() * 6000 + 2000);
    const baseUri = `http://127.0.0.1:${httpPort}`;

    testUtils.startBeforeAll({
        mockNats: true,
        service: (connection) => service.start(connection.natsUrl, httpPort),
        bus: bus
    });

    it("should possible to delete a file from s3", async (done) => {
        try {
            // const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "trump.jpg");

            await bus.request({
                subject: constants.endpoints.service.DELETE_FILE,
                skipOptionsRequest: true,
                message: {
                    reqId: uuid.v4(),
                    data: {
                        file: ""
                    }
                }
            });

            done();
        } catch (err) {
            log.error(err);
            done.fail(err);
        }
    });

});