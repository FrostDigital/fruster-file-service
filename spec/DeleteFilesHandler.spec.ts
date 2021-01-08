const specUtils = require("./support/spec-utils");
import bus from "fruster-bus";
import constants from "../lib/constants";
import uuid from "uuid";
import { start } from "../file-service";

// @ts-ignore
const testUtils = require("fruster-test-utils");


describe("Delete files", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	afterEach(() => {
		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);
	});

	testUtils.startBeforeAll({
		mockNats: true,	
		service: (connection: any) => start(connection.natsUrl, httpPort),
		bus
	});

	it("should possible to delete a file from s3", async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		setTimeout(async () => {

			const { status } = await bus.request({
				subject: constants.endpoints.service.DELETE_FILE,
				skipOptionsRequest: true,
				message: {
					reqId: uuid.v4(),
					data: { url }
				}
			});

			expect(status).toBe(200, "should be success");

			const { statusCode } = await specUtils.get(url);

			expect(statusCode).toBe(403, "file should delete"); //S3 give AccessDenied response rather than 404

		}, 5000);
	});

	it("should possible to delete a files from s3", async () => {
		const { body: { data: { url: url1 } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");
		const { body: { data: { url: url2 } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/large-image.jpg");

		setTimeout(async () => {

			const { status } = await bus.request({
				subject: constants.endpoints.service.DELETE_FILE,
				skipOptionsRequest: true,
				message: {
					reqId: uuid.v4(),
					data: { urls: [url1, url2] }
				}
			});

			expect(status).toBe(200, "should be success");

			const fileResponse1 = await specUtils.get(url1);

			expect(fileResponse1.statusCode).toBe(403, "file should delete"); //S3 give AccessDenied response rather than 404

			const fileResponse2 = await specUtils.get(url2);

			expect(fileResponse2.statusCode).toBe(403, "file should delete"); //S3 give AccessDenied response rather than 404
		}, 5000);
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
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe("BAD_REQUEST");
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
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe("BAD_REQUEST");
			done();
		}
	});

});
