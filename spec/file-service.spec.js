process.env.MAX_FILE_SIZE_MB = 0.1;

var request = require('request'),
    fs = require('fs'),
    conf = require('../conf'),
    bus = require('fruster-bus'),
    nsc = require('nats-server-control'),
    fileService = require('../file-service');


describe('File service', function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  var natsServer;
  var baseUri; 
  
  beforeAll(done => {    
    var httpPort = Math.floor(Math.random() * 6000 + 2000);
    var busPort = Math.floor(Math.random() * 6000 + 2000);
    var busAddress = 'nats://localhost:' + busPort;    
    
    baseUri = 'http://127.0.0.1:' + httpPort;

    nsc.startServer(busPort)    
      .then(server => { natsServer = server; })
      .then(() => fileService.start(httpPort, [busAddress]))
      .then(done)
      .catch(done.fail);
  });

  afterAll(() => {  
    if(natsServer) {    
      natsServer.kill();
    }
  });
  
  it('should upload file to s3 bucket status', function(done) {      
    post('/upload', 'trump.jpg', function(error, response, body) {
      expect(response.statusCode).toBe(201);       
      expect(body.data.url).toContain('https://fruster-uploads.s3.amazonaws.com');
      expect(body.data.originalName).toBe('trump.jpg');
      expect(body.data.key).toContain('.jpeg');
      done();      
    });
  });

  it('should fail to upload non white listed file types', function(done) {      
    post('/upload', 'invalid-ext.xxx', function(error, response, body) {      
      expect(response.statusCode).toBe(403); 
      expect(body.status).toBe(403);
      expect(body.error.title).toBe('File type not allowed');      
      done();      
    });
  });

  it('should fail if no file was provided', function(done) {      
    post('/upload', null, function(error, response, body) {      
      expect(response.statusCode).toBe(400); 
      expect(body.status).toBe(400);
      expect(body.error.title).toBe('No file provided');      
      done();      
    });
  });

  it('should fail to upload a large file', function(done) {      
    post('/upload', 'large-image.jpg', function(error, response, body) {      
      expect(response.statusCode).toBe(400); 
      expect(body.status).toBe(400);
      expect(body.error.title).toBe('File too large');      
      expect(body.error.detail).toBeDefined();      
      done();      
    });
  });
 
  function post(path, imageNames, cb) {
    var formData = {};

    if(imageNames) {
      if(Array.isArray(imageNames)) {
        formData.files = formData.map(file => fs.createReadStream(__dirname + '/support/' + imageName));
      } else {
        formData.file = fs.createReadStream(__dirname + '/support/' + imageNames);
      }      
    }
    
    request.post({
      url: baseUri + path,
      formData: formData
    }, function(err, resp, body) {
      cb(err, resp, body ? JSON.parse(body) : {});
    });
  }

});