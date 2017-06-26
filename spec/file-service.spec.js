process.env.MAX_FILE_SIZE_MB = 0.1;

const request = require("request"),
      fs = require("fs"),
      conf = require("../conf"),
      testUtils = require("fruster-test-utils")
      bus = require("fruster-bus"),      
      fileService = require("../file-service");


describe("File service", function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  var httpPort = Math.floor(Math.random() * 6000 + 2000);
  var baseUri = `http://127.0.0.1:${httpPort}`; 
  
  testUtils.startBeforeAll({
    service: (connection) => fileService.start(connection.natsUrl, httpPort),
    bus: bus
  });  
  
  it("should upload file to s3 bucket", function(done) {      
    post("/upload", "trump.jpg", function(error, response, body) {
      expect(response.statusCode).toBe(201);       
      expect(body.data.url).toContain("https://fruster-uploads");
      expect(body.data.originalName).toBe("trump.jpg");
      expect(body.data.key).toContain(".jpg");
      done();      
    });
  });

  it("should upload file to s3 bucket and keep file extension from uploaded file", function(done) {      
    post("/upload", "random-file-format.fit", function(error, response, body) {
      expect(response.statusCode).toBe(201);       
      expect(body.data.url).toContain("https://fruster-uploads");
      expect(body.data.originalName).toBe("random-file-format.fit");
      expect(body.data.key).toContain(".fit");
      done();      
    });
  });

  it("should upload file to s3 bucket and set file extension from mimetype if no extension is set in file name", function(done) {      
    post("/upload", "file-without-extension", function(error, response, body) {
      expect(response.statusCode).toBe(201);       
      expect(body.data.url).toContain("https://fruster-uploads");
      expect(body.data.originalName).toBe("file-without-extension");
      expect(body.data.key).toContain(".bin");
      done();      
    });
  });

  it("should fail if no file was provided", function(done) {      
    post("/upload", null, function(error, response, body) {      
      expect(response.statusCode).toBe(400); 
      expect(body.status).toBe(400);
      expect(body.error.title).toBe("No file provided");      
      done();      
    });
  });

  it("should fail to upload a large file", function(done) {      
    post("/upload", "large-image.jpg", function(error, response, body) {      
      expect(response.statusCode).toBe(400); 
      expect(body.status).toBe(400);
      expect(body.error.title).toBe("File too large");      
      expect(body.error.detail).toBeDefined();      
      done();      
    });
  });
 
  function post(path, imageNames, cb) {
    var formData = {};

    if(imageNames) {
      if(Array.isArray(imageNames)) {
        formData.files = formData.map(file => fs.createReadStream(__dirname + "/support/" + imageName));
      } else {
        formData.file = fs.createReadStream(__dirname + "/support/" + imageNames);
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