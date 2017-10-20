const bus = require("fruster-bus");
const testUtils = require("fruster-test-utils");
const fileService = require("../file-service");
const specUtils = require("./support/spec-utils");
const conf = require("../conf");


fdescribe("GetImageHandler", () => {

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

    it("hello", async (done) => {

        conf.proxyImages = true;
        conf.proxyImageUrl = baseUri;

        specUtils.post(baseUri, "/upload", "tiny.jpg", async (error, response, body) => {

            const image = await specUtils.get(body.data.url);

            //TODO: 
            console.log("\n");
            console.log(require("util").inspect(image, null, null, true));
            console.log("\n");
            done();
        });

    });

});