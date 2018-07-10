const log = require("fruster-log");
const fileService = require("./file-service");
const conf = require("./conf");
const constants = require('./lib/constants');

require("fruster-health").start();

(async function () {

    try {
        await fileService.start(conf.bus, conf.port);
        log.info(`Successfully started ${constants.serviceName}`);
    } catch (err) {
        log.error(`Failed starting ${constants.serviceName}`, err);
        process.exit(1);
    }

}());
