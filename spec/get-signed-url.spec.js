const mongo = require("mongodb");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const fileService = require("../file-service");
const conf = require("../conf");

describe("Get signed url", () => {

	let httpPort = Math.floor(Math.random() * 6000 + 2000);
	let baseUri = `http://127.0.0.1:${httpPort}`;

	testUtils.startBeforeAll({
		service: (connection) => fileService.start(connection.natsUrl, httpPort),
		bus: bus
	});


	it("should get signed url", (done) => {

		bus.request(`${conf.serviceName}.get-signed-url`, {
				data: {
					file: "foo/bar"
				}
			})
			.then(resp => {
				expect(resp.data.url).toMatch("https://");
				expect(resp.data.url).toMatch("Signature=");
				done();
			});

	});

	it("should remove first slash if set in file", (done) => {

		bus.request(`${conf.serviceName}.get-signed-url`, {
				data: {
					file: "/foo/bar"
				}
			})
			.then(resp => {
				expect(resp.data.url).not.toMatch("//foo/bar");				
				done();
			});

	});

});