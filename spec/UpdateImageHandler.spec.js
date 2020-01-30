const uuid = require("uuid");
const path = require("path");
const requestImageSize = require('request-image-size');
const testUtils = require("fruster-test-utils");
const specUtils = require("./support/spec-utils");
const bus = require("fruster-bus");
const testBus = require("fruster-bus").testBus;
const constants = require("../lib/constants");
const conf = require("../conf");
const confBackup = Object.assign({}, conf);
const service = require("../file-service");

describe("UpdateImageHandler", () => {
	let httpPort;
	let baseUri;

	let originalTimeout;
	beforeEach(() => {
		originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
	});

	afterEach((done) => {
		conf.proxyImages = confBackup.proxyImages;
		conf.proxyImageUrl = confBackup.proxyImageUrl;
		conf.serviceHttpUrl = confBackup.serviceHttpUrl;;

		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

		done();
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
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		const originalImageSize = await getImageSize(url);

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
		expect(data.imageUrl).toBeDefined("imageUrl");

		const rotateImageSize = await getImageSize(data.imageUrl);

		expect(rotateImageSize.width).toBe(originalImageSize.height, "rotate image width");
		expect(rotateImageSize.height).toBe(originalImageSize.width, "rotate image height");
	});

	it("should send rotated image when it request again", async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		const { data: { imageUrl: imageUrl1 } } = await testBus.request({
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

		const { data: { imageUrl: imageUrl2 } } = await testBus.request({
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

		expect(imageUrl1).toBe(imageUrl2, "image urls should be same");
	});

	async function getImageSize(url) {
		return new Promise((resolve, reject) => {
			requestImageSize(url)
				.then(size => resolve(size))
				.catch(err => reject(err));
		});
	}

});
