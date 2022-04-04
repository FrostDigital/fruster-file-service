import frusterTestUtils from "fruster-test-utils";
import bus from "fruster-bus";
import { v4 } from "uuid";

import conf from "../conf";
import { start } from "../file-service";
import errors from "../lib/errors";
import constants from "../lib/constants";

import specUtils from "./support/spec-utils";

const confBackup = { ...conf };

describe("DeleteFilesHandler", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	beforeEach(() => {
		conf.proxyImages = true;
		conf.proxyImageUrl = baseUri;
	});

	afterEach(() => {
		conf.proxyImages = confBackup.proxyImages;
		conf.proxyImageUrl = confBackup.proxyImageUrl;

		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);
	});

	frusterTestUtils.startBeforeAll({
		mockNats: true,
		service: (connection: any) => start(connection.natsUrl, httpPort),
		bus
	});

	it("should possible to delete a file from s3", async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		const { status } = await bus.request({
			subject: constants.endpoints.service.DELETE_FILE,
			skipOptionsRequest: true,
			message: {
				reqId: v4(),
				data: { url }
			}
		});

		expect(status).toBe(200);

		try {
			await specUtils.get(url);
		} catch ({ status, error }) {
			expect(status).toBe(404);
			expect(error.code).toBe(errors.notFound().error.code);
		}
	});

	it("should possible to delete a files from s3", async () => {
		const { body: { data: { url: url1 } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");
		const { body: { data: { url: url2 } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		const { status } = await bus.request({
			subject: constants.endpoints.service.DELETE_FILE,
			skipOptionsRequest: true,
			message: {
				reqId: v4(),
				data: { urls: [url1, url2] }
			}
		});

		expect(status).toBe(200);

		try {
			await specUtils.get(url1);
		} catch ({ status, error }) {
			expect(status).toBe(404);
			expect(error.code).toBe(errors.notFound().error.code);
		}

		try {
			await specUtils.get(url2);
		} catch ({ status, error }) {
			expect(status).toBe(404);
			expect(error.code).toBe(errors.notFound().error.code);
		}
	});

	it("should possible to delete a file from s3 using file key", async () => {
		const { body: { data: { url, key } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		const { status } = await bus.request({
			subject: constants.endpoints.service.DELETE_FILE,
			skipOptionsRequest: true,
			message: {
				reqId: v4(),
				data: { file: { key } }
			}
		});

		expect(status).toBe(200);

		try {
			await specUtils.get(url);
		} catch ({ status, error }) {
			expect(status).toBe(404);
			expect(error.code).toBe(errors.notFound().error.code);
		}
	});

	it("should possible to delete a files from s3 via file keys", async () => {
		const { body: { data: { url: url1, key: key1 } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");
		const { body: { data: { url: url2, key: key2 } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		const { status } = await bus.request({
			subject: constants.endpoints.service.DELETE_FILE,
			skipOptionsRequest: true,
			message: {
				reqId: v4(),
				data: { files: [{ key: key1 }, { key: key2 }] }
			}
		});

		expect(status).toBe(200);

		try {
			await specUtils.get(url1);
		} catch ({ status, error }) {
			expect(status).toBe(404);
			expect(error.code).toBe(errors.notFound().error.code);
		}

		try {
			await specUtils.get(url2);
		} catch ({ status, error }) {
			expect(status).toBe(404);
			expect(error.code).toBe(errors.notFound().error.code);
		}
	});

	it("should throw error if file url not provide", async (done) => {
		try {
			await bus.request({
				subject: constants.endpoints.service.DELETE_FILE,
				skipOptionsRequest: true,
				message: {
					reqId: v4(),
					data: {
						url: null
					}
				}
			});

			done.fail();
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe("BAD_REQUEST");
			done();
		}
	});

	it("should throw error if files urls not provide", async (done) => {
		try {
			await bus.request({
				subject: constants.endpoints.service.DELETE_FILE,
				skipOptionsRequest: true,
				message: {
					reqId: v4(),
					data: {
						urls: []
					}
				}
			});

			done.fail();
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe("BAD_REQUEST");
			done();
		}
	});

});
