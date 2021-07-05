import bus from "fruster-bus";
import testUtils from "fruster-test-utils";

import { start } from "../file-service";
import constants from "../lib/constants";

import specUtils from "./support/spec-utils";

describe("GetFileKeyHandler", () => {
	let httpPort = 0;
	let baseUri = "";

	afterEach(() => {
		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);
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

				return await start(connection.natsUrl!, httpPort);
			},
			bus
		});

	async function uploadFile(file: string) {
		const { body: { data: { key } } } = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, file);

		return key;
	}

	it("should be possible to get file by key", async () => {
		const fileKey = await uploadFile("data/tiny.jpg");

		const { body } = await specUtils.get(baseUri, `/file/${fileKey}`);

		expect(body).toBeDefined();
		expect(body.length > 7000 && body.length < 8000).toBeTruthy();
	});
});
