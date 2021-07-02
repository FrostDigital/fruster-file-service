import bus, { testBus } from "fruster-bus";
import testUtils from "fruster-test-utils";
import http from "http";
import imageSize from 'image-size';
import path from "path";
import { v4 } from "uuid";
import conf from "../conf";
import { start } from "../file-service";
import constants from "../lib/constants";

const specUtils = require("./support/spec-utils");


const confBackup = { ...conf };

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

			return await start(connection.natsUrl!, httpPort);
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
				reqId: v4(),
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
				reqId: v4(),
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
				reqId: v4(),
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
	async function getImageSize(imageUrl: string): Promise<{ width?: number, height?: number }> {
		if (imageUrl.startsWith("http")) {
			return new Promise((resolve, reject) => {
				http.get(imageUrl, function (response) {
					const chunks: any[] = []
					response.on("data", (chunk) => {
						chunks.push(chunk)
					}).on("end", () => {
						const buffer = Buffer.concat(chunks);
						resolve(imageSize(buffer));
					}).on("error", reject);
				});
			});
		} else {
			return imageSize(imageUrl)
		}
	}

});
