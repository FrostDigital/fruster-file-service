const log = require('fruster-log');
const fileService = require('./file-service');
const conf = require('./conf');

fileService
  .start(conf.port, conf.bus)
  .then(function() {
    log.info('File service started and connected to bus', conf.bus);
  })
  .catch(function(err) {
    log.error('Failed starting file service', err);
    process.exit(1);
  });

