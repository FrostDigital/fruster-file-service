import bus from "fruster-bus";
import conf from "../conf";
import { start } from "../file-service";
import constants from "../lib/constants";
import InMemoryImageCacheRepo from "../lib/repos/InMemoryImageCacheRepo";
import testUtils from "fruster-test-utils";

const specUtils = require("./support/spec-utils");

const confBackup = { ...conf };

describe("GetImageHandler", () => {
	let httpPort = 0;
	let baseUri = "";
	let repo: InMemoryImageCacheRepo;
	let originalTimeout = 0;

	beforeEach(() => {
		originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
	});

	afterEach(() => {
		conf.proxyImages = confBackup.proxyImages;
		conf.proxyImageUrl = confBackup.proxyImageUrl;
		conf.serviceHttpUrl = confBackup.serviceHttpUrl;
		conf.port = confBackup.port;

		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});

	testUtils.startBeforeEach(/**
		 * @param {{ natsUrl: string; }} connection
		 */
		{
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
				repo = new InMemoryImageCacheRepo();

				return await start(connection.natsUrl!, httpPort);
			},
			bus
		});

	async function setupImageUrl() {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/tiny.jpg");

		return url;
	}

	it("should be possible to get proxied images", async () => {
		const { body, headers } = await specUtils.get(await setupImageUrl());

		expect(body).toBeDefined("image should be get");
		expect(body.length > 7000 && body.length < 8000).toBeTruthy("image.length");
		expect(headers["cache-control"]).toBe("max-age=" + conf.cacheControlMaxAgeSec);
	});

	it("should be possible to scale image", async () => {
		const smallHeight = 3;

		const url = await setupImageUrl();
		const smallImageResponse = await specUtils.get(`${url}?height=${smallHeight}`);

		expect(smallImageResponse.body).toBeDefined("smallImageResponse.body");
		expect(smallImageResponse.body.length).toBe(306, "smallImageResponse.body.length");

		setTimeout(async () => {
			/*
			 * Since we do not wait for resized image to be uploaded before sending them back to user
			 * we need to wait a bit in order for the image to be uploaded before checking the repo cache.
			 */
			const urlSplits = url.split("/");
			const imageName = urlSplits[urlSplits.length - 1];
			const inMemoryRepoCacheData = (await specUtils.get(baseUri + "/proxy-cache")).body;

			const cachedUrlSmallImage = inMemoryRepoCacheData[repo.getCacheKey(imageName, { height: smallHeight })];

			expect(cachedUrlSmallImage).toBeDefined("cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain(`h-${smallHeight}`, "cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain("w-null", "cachedUrlSmallImage");
		}, 5000);
	});

	it("should return image url from memory if image has been resized earlier", async () => {
		const smallHeight = 3;

		const url = await setupImageUrl();

		await specUtils.get(`${url}?height=${smallHeight}`);

		setTimeout(async () => {
			await specUtils.get(`${url}?height=${smallHeight}`);
			/*
			 * Since we do not wait for resized image to be uploaded before sending them back to user
			 * we need to wait a bit in order for the image to be uploaded before checking the repo cache.
			 */
			const urlSplits = url.split("/");
			const imageName = urlSplits[urlSplits.length - 1];
			const inMemoryRepoCacheData = (await specUtils.get(baseUri + "/proxy-cache")).body;

			const cachedUrlSmallImage = inMemoryRepoCacheData[repo.getCacheKey(imageName, { height: smallHeight })];

			expect(cachedUrlSmallImage).toBeDefined("cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain(`h-${smallHeight}`, "cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain("w-null", "cachedUrlSmallImage");

			expect(Object.keys(inMemoryRepoCacheData[imageName]).length).toBe(1);
		}, 5000);
	});

	it("should get image from S3 if it exists", async () => {
		const height = 10;

		let url = `${conf.serviceHttpUrl}${constants.endpoints.http.GET_IMAGE.replace("*", "")}?height=${height}`;
		url = url.replace(":imageName", "d31fe20a-11c9-4368-825a-02d68ac0199a.jpg");

		await specUtils.get(url);

		setTimeout(async () => {
			/*
			 * Since we do not wait for resized image to be uploaded before sending them back to user
			 * we need to wait a bit in order for the image to be uploaded before checking the repo cache.
			 */
			const urlSplits = url.split("/");
			let imageName = urlSplits[urlSplits.length - 1];
			imageName = imageName.replace(`?height=${height}`, "");
			const inMemoryRepoCacheData = (await specUtils.get(baseUri + "/proxy-cache")).body;

			const cachedUrlSmallImage = inMemoryRepoCacheData[repo.getCacheKey(imageName, { height })];

			expect(cachedUrlSmallImage).toBeDefined("cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain(`h-${height}`, "cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain("w-null", "cachedUrlSmallImage");

			expect(Object.keys(inMemoryRepoCacheData[imageName]).length).toBe(1);
		}, 9500);
	});

	it("should return scaled image even if it wasn't possible to upload to s3", async () => {
		const smallHeight = 3;
		const bigHeight = 100;
		const bigWidth = 101;

		const url = await setupImageUrl();
		const smallImageResponse = await specUtils.get(`${url}?height=${smallHeight}`);
		const bigImageResponse = await specUtils.get(`${url}?height=${bigHeight}&width=${bigWidth}`);

		expect(smallImageResponse.body).toBeDefined("smallImageResponse.body");
		expect(smallImageResponse.body.length > 300 && smallImageResponse.body.length < 350).toBeTruthy("smallImageResponse.body.length");

		expect(bigImageResponse.body).toBeDefined("bigImageResponse.body");
		expect(bigImageResponse.body.length > 800 && bigImageResponse.body.length < 850).toBeTruthy("bigImageResponse.body.length");

		setTimeout(async () => {
			/*
			 * Since we do not wait for resized image to be uploaded before sending them back to user
			 * we need to wait a bit in order for the image to be uploaded before checking the repo cache.
			 */
			const urlSplits = url.split("/");
			const imageName = urlSplits[urlSplits.length - 1];
			const inMemoryRepoCacheData = (await specUtils.get(baseUri + "/proxy-cache")).body;

			const cachedUrlSmallImage = inMemoryRepoCacheData[imageName];
			const cachedUrlBigImage = inMemoryRepoCacheData[imageName];

			expect(cachedUrlSmallImage).toBeUndefined("cachedUrlSmallImage");
			expect(cachedUrlBigImage).toBeUndefined("cachedUrlBigImage");
		}, 9500);
	});

	it("should return 404 if image does not exist", async () => {
		const url = conf.proxyImageUrl + "/image/olabandola.jpg";
		const { statusCode, headers, body } = await specUtils.get(url);

		expect(statusCode).toBeDefined(404);
		expect(headers["cache-control"]).toBe("max-age=0");
	});

	it("should return error if image does not exist when using resizing query", async () => {
		const url = conf.proxyImageUrl + "/image/olabandola.jpg?height=200";
		const { statusCode, headers } = await specUtils.get(url);

		expect(statusCode).toBeDefined(404);
		expect(headers["cache-control"]).toBe("max-age=0");
	});

});
