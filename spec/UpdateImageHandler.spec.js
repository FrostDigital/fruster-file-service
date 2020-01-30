const fs = require("fs");
const uuid = require("uuid");
const path = require("path");
const testUtils = require("fruster-test-utils");
const specUtils = require("./support/spec-utils");
const bus = require("fruster-bus");
const testBus = require("fruster-bus").testBus;
const constants = require("../lib/constants");
const conf = require("../conf");
const service = require("../file-service");

describe("UpdateImageHandler", () => {
	jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000;

	let httpPort;
	let baseUri;

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

	testUtils.startBeforeEach({
		mockNats: true,
		service: async (connection) => {
			do {
				httpPort = Math.floor(Math.random() * 6000 + 3000);
			} while (httpPort === 3410);

			baseUri = `http://127.0.0.1:${httpPort}`;

			conf.proxyImages = true;
			conf.proxyImageUrl = baseUri;
			conf.serviceHttpUrl = baseUri;

			return await service.start(connection.natsUrl, httpPort);
		},
		bus
	});

	it("should possible to rotate a image", async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		const { status, data } = await testBus.request({
			subject: constants.endpoints.http.bus.UPDATE_IMAGE,
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				params: {
					imageName: path.basename(url)
				},
				data: { angle: 90 }
			}
		});

		expect(status).toBe(200, "status");
		expect(data.imageUrl).toBe("", "");
	});

});
