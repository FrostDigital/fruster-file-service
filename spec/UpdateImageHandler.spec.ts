import uuid from "uuid";
import path from "path";
import bus, {testBus} from "fruster-bus";
import constants from "../lib/constants";
import conf from "../conf";
import { start } from "../file-service";

const specUtils = require("./support/spec-utils");

// @ts-ignore
const requestImageSize = require("request-image-size");
// @ts-ignore
const testUtils = require("fruster-test-utils");

const confBackup = {...conf};

describe("UpdateImageHandler", () => {
	let httpPort = 0;
	let baseUri = "";
	let originalTimeout = 0;

	beforeEach(() => {
		originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
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
		// @ts-ignore
		service: async (connection) => {
			do {
				httpPort = Math.floor(Math.random() * 6000 + 3000);
			} while (httpPort === 3410);

			baseUri = `http://127.0.0.1:${httpPort}`;

			conf.proxyImages = true;
			conf.proxyImageUrl = baseUri;
			conf.serviceHttpUrl = baseUri;

			return await start(connection.natsUrl, httpPort);
		},
		bus
	});

	it("should be possible to rotate a image", async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		const originalImageSize = await getImageSize(url);

		const { status, data } = await testBus.request<any, any>({
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
		expect(data.amazonUrl).toBeDefined("amazonUrl");
		expect(data.url).toBeDefined("url");
		expect(data.key).toBeDefined("key");

		const rotateImageSize = await getImageSize(data.amazonUrl);

		expect(rotateImageSize.width).toBe(originalImageSize.height, "rotate image width");
		expect(rotateImageSize.height).toBe(originalImageSize.width, "rotate image height");
	});

	it("should send rotated image when it request again", async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		const { data: { amazonUrl: amazonUrl1 } } = await testBus.request({
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

		const { data: { amazonUrl: amazonUrl2 } } = await testBus.request({
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

		expect(amazonUrl1).toBe(amazonUrl2, "image urls should be same");
	});

	/**
	 * @param {any} url
	 */
	async function getImageSize(url: string) {
		return new Promise<{width: number, height: number}>((resolve, reject) => {
			requestImageSize(url)
				// @ts-ignore
				.then(size => resolve(size))
				// @ts-ignore
				.catch(err => reject(err));
		});
	}

});
