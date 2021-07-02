import bus from "fruster-bus";
import frusterTestUtils from "fruster-test-utils";

import constants from "../lib/constants";
import { start } from "../file-service";
import specUtils from "./support/spec-utils";
import { SERVICE_SUBJECT } from "../lib/handlers/GetFilesHandler";
import { ListObjectResponse } from "../lib/models/ListObjectsResponse";
import S3Client from "../lib/clients/S3Client";

describe("GetFilesHandler", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	beforeEach(async () => {
		const s3 = new S3Client();
		await s3.deleteBucket();
	});

	afterEach(async () => {
		specUtils.removeFilesInDirectory(constants.temporaryImageLocation);
	});

	frusterTestUtils.startBeforeAll({
		mockNats: true,
		service: (connection: any) => start(connection.natsUrl, httpPort),
		bus
	});

	it("should possible to get files from s3", async () => {
		const {
			body: {
				data: { key }
			}
		} = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/trump.jpg");

		const { status, data: { files } } = await bus.request<void, ListObjectResponse>({
			subject: SERVICE_SUBJECT,
			skipOptionsRequest: true,
			message: { reqId: "reqId" }
		});

		expect(status).toBe(200);
		expect(files.length).toBe(1);
		expect(files[0].key).toBe(key);
	});

});
