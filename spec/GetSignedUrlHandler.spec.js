const mongo = require("mongodb");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const fileService = require("../file-service");
const conf = require("../conf");
const constants = require("../lib/constants");
const uuid = require("uuid");
const log = require("fruster-log");


describe("Get signed url", () => {

	let httpPort;
	let baseUri;

	testUtils.startBeforeAll({
		mockNats: true,
		service: async (connection) => {
			do {
				httpPort = Math.floor(Math.random() * 6000 + 2000);
				baseUri = `http://127.0.0.1:${httpPort}`;
			} while (httpPort === 3410);
			return await fileService.start(connection.natsUrl, httpPort);
		},
		bus: bus
	});

	it("should get signed url", async (done) => {
		try {
			const resp = await bus.request({
				subject: constants.endpoints.service.GET_SIGNED_URL,
				skipOptionsRequest: true,
				message: {
					reqId: uuid.v4(),
					data: { file: "foo/bar" }
				}
			});

			expect(resp.data.url).toMatch("https://");
			expect(resp.data.url).toMatch("Signature=");

			done();
		} catch (err) {
			log.error(err);
			done.fail(err);
		}
	});

	it("should remove first slash if set in file", async (done) => {
		try {
			const resp = await bus.request({
				subject: constants.endpoints.service.GET_SIGNED_URL,
				skipOptionsRequest: true,
				message: {
					reqId: uuid.v4(),
					data: { file: "foo/bar" }
				}
			});

			expect(resp.data.url).not.toMatch("//foo/bar");

			done();
		} catch (err) {
			log.error(err);
			done.fail(err);
		}
	});

	it("should remove protocol and domain if full URL is set", async (done) => {
		try {
			const resp = await bus.request({
				subject: constants.endpoints.service.GET_SIGNED_URL,
				skipOptionsRequest: true,
				message: {
					reqId: uuid.v4(),
					data: {
						file: "https://example.com/foo/bar"
					}
				}
			});

			expect(resp.data.url).toMatch(`amazonaws.com/foo/bar`);

			done();
		} catch (err) {
			log.error(err);
			done.fail(err);
		}
	});

});