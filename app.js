const log = require("fruster-log");
const fileService = require("./file-service");
const conf = require("./conf");

require("fruster-health").start();

fileService
	.start(conf.bus, conf.port)
	.then(function () {
		log.info("File service started and connected to bus", conf.bus);
	})
	.catch(function (err)  {
		log.error("Failed starting file service", err);
		process.exit(1);
	});