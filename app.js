const log = require("fruster-log");
const fileService = require("./file-service");
const conf = require("./conf");
const constants = require('./lib/constants');
const health = require("fruster-health");

health.start();

(async function () {

    try {
        await fileService.start(conf.bus, conf.port);
        log.info(`Successfully started ${constants.serviceName}`);
    } catch (err) {
        log.error(`Failed starting ${constants.serviceName}`, err);
        process.exit(1);
    }

}());

process.on("uncaughtException", (err) => {
    log.error(err);
    if (err.message && err.message.includes("ECONNRESET")) {
        health.fail("Service failure due to ECONNRESET");
    }
});