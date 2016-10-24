const express = require('express');
const log = require('fruster-log');
const bus = require('fruster-bus');
const errors = require('./errors');
const bodyParser = require('body-parser');
const http = require('http');
const app = express();
const conf = require('./conf');
const upload = require('./upload-config');
const dateStarted = new Date();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.get('/health', function (req, res) {
  res.json({
    status: 'Alive since ' + dateStarted
  });
});

app.post('/upload', upload.single('file'), function (req, res) {
  if (req.fileUploadError) {
    return sendError(res, req.fileUploadError);
  }

  if (!req.file) {
    return sendError(res, errors.fileNotProvided());
  }

  log.debug('Uploaded file', req.file.originalname, '->', req.file.location);

  res
    .status(201)
    .json({
      status: 201,
      data: {
        url: req.file.location,
        key: req.file.key,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      }
    });
});

app.use(function (err, req, res, next) { // Do not remove `next`, express will break!
  if (err.code == 'LIMIT_FILE_SIZE') {
    return sendError(res, errors.fileTooLarge(conf.maxFileSize));
  } else {
    return sendError(res, errors.unknownError(err));
  }
});

function sendError(res, error) {
  res
    .status(error.status)
    .json(error);
}

module.exports = {
  start: function (httpServerPort, busAddress) {
    var startHttpServer = new Promise(function (resolve, reject) {
      http.createServer(app)
        .listen(httpServerPort)
        .on('error', reject)
        .on('listening', resolve);
    });

    var connectToBus = function () {
      return bus.connect(busAddress)
        .then(() =>  {
          // TODO
          // bus.subscribe('file-service.get-meta', getMeta);
          bus.subscribe("http.get." + conf.serviceName + '.health')
            .forwardToHttpUrl(conf.serviceHttpUrl + "/health");

          if (conf.mustBeLoggedIn === "true") {
            bus.subscribe("http.post." + conf.serviceName + '.upload')
              .forwardToHttpUrl(conf.serviceHttpUrl + "/upload")
              .mustBeLoggedIn();
          } else {
            bus.subscribe("http.post." + conf.serviceName + '.upload')
              .forwardToHttpUrl(conf.serviceHttpUrl + "/upload");
          }
        });
    };

    return startHttpServer.then(connectToBus);
  }
};