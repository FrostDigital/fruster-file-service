const multerS3 = require('multer-s3');
const multer = require('multer');
const aws = require('aws-sdk');
const uuid = require('uuid');
const mime = require('mime-types');
const conf = require('./conf');
const errors = require('./errors');

const bucket = new aws.S3({
  accessKeyId: conf.s3AccessKey,
  secretAccessKey: conf.s3Secret,
  params: {
    Bucket: conf.s3Bucket
  }
});

module.exports = multer({
  limits: {
    fileSize: conf.maxFileSize * 1024 * 1024
  },
  
  fileFilter: function(req, file, cb) {        
    
    if(file && !isValidMimeType(file.mimetype)) {
      // Attach error details to request object so it can be used later on
      req.fileUploadError = errors.invalidFileType(file.originalname);
      return cb(null, false);
    }
    
    cb(null, true);
  },
  
  // Use S3 as storage, according to docs the upload should be streamed 
  storage: multerS3({
    s3: bucket,
    bucket: conf.s3Bucket,
    acl: conf.s3Acl,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname
      });
    },
    key: function (req, file, cb) {
      cb(null, uuid.v4() + '.' + mime.extension(file.mimetype));
    }
  })
});

function isValidMimeType(mimeType) {
  // TODO: make this configurable
  return /^image\/(jpe?g|png|gif|txt|doc|pdf)$/i.test(mimeType);
}
