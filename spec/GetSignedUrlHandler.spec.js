const mongo = require("mongodb");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const fileService = require("../file-service");
const conf = require("../conf");
const constants = require("../lib/constants");


describe("Get signed url", () => {

	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	testUtils.startBeforeAll({
		mockNats: true,
		service: (connection) => fileService.start(connection.natsUrl, httpPort),
		bus: bus
	});


	it("should get signed url", async (done) => {

		const resp = await bus.request(constants.endpoints.http.bus.GET_SIGNED_URL, {
			data: {
				file: "foo/bar"
			}
		});

		expect(resp.data.url).toMatch("https://");
		expect(resp.data.url).toMatch("Signature=");
		done();

	});

	it("should remove first slash if set in file", async (done) => {

		const resp = await bus.request(constants.endpoints.http.bus.GET_SIGNED_URL, {
			data: {
				file: "/foo/bar"
			}
		});

		expect(resp.data.url).not.toMatch("//foo/bar");
		done();

	});

});