const bus = require("fruster-bus");
const testUtils = require("fruster-test-utils");
const fileService = require("../file-service");
const specUtils = require("./support/spec-utils");
const conf = require("../conf");
const confBackup = Object.assign({}, conf);
const constants = require("../lib/constants");
const InMemoryImageCacheRepo = require("../lib/repos/InMemoryImageCacheRepo");


describe("GetImageHandler", () => {

	let httpPort;
	let baseUri;

	afterEach((done) => {
		conf.proxyImages = confBackup.proxyImages;
		conf.proxyImageUrl = confBackup.proxyImageUrl;
		conf.serviceHttpUrl = confBackup.serviceHttpUrl;
		conf.port = confBackup.port;

		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);

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
			conf.serviceHttpUrl = baseUri;

			return await fileService.start(connection.natsUrl, httpPort);
		},
		bus: bus
	});

	async function setupImageUrl() {
		const response = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/tiny.jpg");
		return response.body.data.url;
	}

	it("should be possible to get proxied images", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
		conf.serviceHttpUrl = baseUri;

		const imageResponse = await specUtils.get(await setupImageUrl());

		expect(imageResponse.body).toBeDefined("image should be get");
		expect(imageResponse.body.length > 7000 && imageResponse.body.length < 8000).toBeTruthy("image.length");
		expect(imageResponse.headers["cache-control"]).toBe("max-age=" + conf.cacheControlMaxAgeSec);
	});

	it("should be possible to scale image", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
		conf.serviceHttpUrl = baseUri;

		const smallHeight = 3;

		const url = await setupImageUrl();
		const smallImageResponse = await specUtils.get(`${url}?height=${smallHeight}`);

		expect(smallImageResponse.body).toBeDefined("smallImageResponse.body");
		expect(smallImageResponse.body.length).toBe(302, "smallImageResponse.body.length");

		setTimeout(async () => {
			/*
			 * Since we do not wait for resized image to be uploaded before sending them back to user
			 * we need to wait a bit in order for the image to be uploaded before checking the repo cache.
			 */
			const urlSplits = url.split("/");
			const imageName = urlSplits[urlSplits.length - 1];
			const inMemoryRepoCacheData = (await specUtils.get(baseUri + "/proxy-cache")).body;

			const cachedUrlSmallImage = inMemoryRepoCacheData[imageName][InMemoryImageCacheRepo._queryToString({
				height: smallHeight
			})];

			expect(cachedUrlSmallImage).toBeDefined("cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain(`h-${smallHeight}`, "cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain("w-null", "cachedUrlSmallImage");
		}, 5000);
	});

	it("should return image url from memory if image has been resized earlier", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
		conf.serviceHttpUrl = baseUri;

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

			const cachedUrlSmallImage = inMemoryRepoCacheData[imageName][InMemoryImageCacheRepo._queryToString({
				height: smallHeight
			})];

			expect(cachedUrlSmallImage).toBeDefined("cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain(`h-${smallHeight}`, "cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain("w-null", "cachedUrlSmallImage");

			expect(Object.keys(inMemoryRepoCacheData[imageName]).length).toBe(1);
		}, 7000);
	});

	it("should get image from S3 if it exists", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
		conf.serviceHttpUrl = baseUri;

		const height = 10;

		let url = `${conf.serviceHttpUrl}${constants.endpoints.http.GET_IMAGE}?height=${height}`;
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
			const cachedUrlSmallImage = inMemoryRepoCacheData[imageName][InMemoryImageCacheRepo._queryToString({
				height: height
			})];

			expect(cachedUrlSmallImage).toBeDefined("cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain(`h-${height}`, "cachedUrlSmallImage");
			expect(cachedUrlSmallImage).toContain("w-null", "cachedUrlSmallImage");

			expect(Object.keys(inMemoryRepoCacheData[imageName]).length).toBe(1);
		}, 3000);
	});

	it("should return scaled image even if it wasn't possible to upload to s3", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;

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
		}, 3000);
	});

	it("should return 404 if image does not exist", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
		conf.serviceHttpUrl = baseUri;

		const url = conf.proxyImageUrl + "/image/olabandola.jpg";
		const imageResponse = await specUtils.get(url);

		console.log(imageResponse);

		expect(imageResponse.statusCode).toBeDefined(404);
		expect(imageResponse.headers["cache-control"]).toBe("max-age=0");
	});

	it("should return error if image does not exist when using resizing query", async () => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
		conf.serviceHttpUrl = baseUri;

		const url = conf.proxyImageUrl + "/image/olabandola.jpg?height=200";
		const imageResponse = await specUtils.get(url);

		expect(imageResponse.statusCode).toBeDefined(404);
		expect(imageResponse.headers["cache-control"]).toBe("max-age=0");
	});

});
