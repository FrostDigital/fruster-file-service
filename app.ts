import conf from "./conf";
import constants from "./lib/constants";
import {start} from "./file-service";
import * as log from "fruster-log";

const health = require("fruster-health");

health.start();

(async function () {
	try {
		await start(conf.bus[0], conf.port);
		log.info(`Successfully started ${constants.serviceName}`);
	} catch (err) {
		log.error(`Failed starting ${constants.serviceName}`, err);
		process.exit(1);
	}
})();

process.on("uncaughtException", (err) => {
	log.error(err);
	if (err.message && err.message.includes("ECONNRESET")) {
		health.fail("Service failure due to ECONNRESET");
	}
});
