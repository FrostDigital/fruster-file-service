import bus from "fruster-bus";
import { start } from "../file-service";
import constants from "../lib/constants";
import uuid from "uuid";
import testUtils from "fruster-test-utils";
const specUtils = require("./support/spec-utils");


describe("Get signed url", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	let uploadedFile = "";

	testUtils.startBeforeAll({
		mockNats: true,
		service: (connection) => start(connection.natsUrl!, httpPort),
		bus
	});

	beforeAll(async () => {
		const { body: { data: { url } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/tiny.jpg");
		uploadedFile = url;
	});


	it("should get signed url", async () => {
		const [, uploadedFileFilename] = uploadedFile.split("/");
		const { data: { url } } = await bus.request({
			subject: constants.endpoints.service.GET_SIGNED_URL,
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				data: {
					file: uploadedFileFilename
				}
			}
		});

		expect(url).toMatch("https://");
		expect(url).toMatch("Signature=");
	});

	it("should fail if file does not exist", async () => {
		try {
			await bus.request({
				subject: constants.endpoints.service.GET_SIGNED_URL,
				skipOptionsRequest: true,
				message: {
					reqId: uuid.v4(),
					data: {
						file: "foo/bar"
					}
				}
			});
			fail();
		} catch (err) {
			expect(err).toBeDefined();
		}

	});


});
