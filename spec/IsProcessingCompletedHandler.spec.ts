import bus from "fruster-bus";
import testUtils from "fruster-test-utils";
import { v4 } from "uuid";
import conf from "../conf";
import { start } from "../file-service";
import constants from "../lib/constants";
import { SUBJECT } from '../lib/handlers/IsProcessingCompletedHandler';
import { sleep } from "../lib/util/utils";


const specUtils = require("./support/spec-utils");

describe("IsProcessingCompleted", () => {
	const httpPort = Math.floor(Math.random() * 6000 + 2000);
	const baseUri = `http://127.0.0.1:${httpPort}`;

	testUtils.startBeforeAll({
		mockNats: true,
		service: (connection) => start(connection.natsUrl!, httpPort),
		bus
	});

	//XIT because sometime processing completes when it checking. No way to keep file as processing.
	xit("should possible to check a video is completed processing (false status)", async () => {
		conf.proxyImages = true;
		conf.videoQuality = 320;
		conf.noOfThumbnails = 3;
		conf.videoFormat = "mov";

		const {
			body: { data: { url } }
		} = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/small.mp4");

		const { status, data } = await bus.request<any, any>({
			subject: SUBJECT,
			skipOptionsRequest: true,
			message: {
				reqId: v4(),
				data: { url }
			}
		});

		expect(status).toBe(200, "status");
		expect(data.finished).toBe(false, "processing status");

		conf.proxyImages = false;
		conf.videoQuality = 480;
		conf.noOfThumbnails = 0;
		conf.videoFormat = undefined;
	});

	it("should possible to check a video is completed processing (true status)", async () => {
		const {
			body: { data: { url } }
		} = await specUtils.post(baseUri, constants.endpoints.http.UPLOAD_FILE, "data/small.mp4");

		await sleep(5000);

		const { status, data } = await bus.request<any, any>({
			subject: SUBJECT,
			skipOptionsRequest: true,
			message: {
				reqId: v4(),
				data: { url }
			}
		});

		expect(status).toBe(200, "status");
		expect(data.finished).toBe(true, "processing status");

	});

	it("should throw error if file url not provide", async () => {
		try {
			await bus.request({
				subject: SUBJECT,
				skipOptionsRequest: true,
				message: {
					reqId: v4(),
					data: {
						url: null
					}
				}
			});

			expect(true).toBe(false);
		} catch (err: any) {
			console.log(err);
			expect(err.status).toBe(400);
			expect(err.error.code).toBe("BAD_REQUEST");
		}
	});

});
