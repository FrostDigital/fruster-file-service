const log = require("fruster-log");
const fileService = require("./file-service");
const conf = require("./conf");

require("fruster-health").start();

(async function () {

    try {
        await fileService.start(conf.bus, conf.port);
        log.info("File service started and connected to bus", conf.bus);
    } catch (err) {
        log.error("Failed starting file service", err);
        process.exit(1);
    }

}());