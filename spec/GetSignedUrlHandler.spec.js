const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const fileService = require("../file-service");
const constants = require("../lib/constants");
const uuid = require("uuid");

describe("Get signed url", () => {

	let httpPort;

	testUtils.startBeforeAll({
		mockNats: true,
		service: async (connection) => {
			do {
				httpPort = Math.floor(Math.random() * 6000 + 2000);
			} while (httpPort === 3410);
			return await fileService.start(connection.natsUrl, httpPort);
		},
		bus
	});

	it("should get signed url", async () => {
		const { data: { url } } = await bus.request({
			subject: constants.endpoints.service.GET_SIGNED_URL,
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				data: {
					file: "foo/bar"
				}
			}
		});

		expect(url).toMatch("https://");
		expect(url).toMatch("Signature=");
	});

	it("should remove first slash if set in file", async () => {
		const { data: { url } } = await bus.request({
			subject: constants.endpoints.service.GET_SIGNED_URL,
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				data: {
					file: "foo/bar"
				}
			}
		});

		expect(url).not.toMatch("//foo/bar");
	});

	it("should remove protocol and domain if full URL is set", async () => {
		const { data: { url } } = await bus.request({
			subject: constants.endpoints.service.GET_SIGNED_URL,
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				data: {
					file: "https://example.com/foo/bar"
				}
			}
		});

		expect(url).toMatch(`amazonaws.com/foo/bar`);
	});

});
