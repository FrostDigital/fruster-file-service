const uuid = require('uuid');
const serviceId = 'file-service';

const errorCode = {
  fileNotProvided: serviceId + '.400.1',
  fileTooLarge: serviceId + '.400.2',
  invalidFileType: serviceId + '.403.1',
  unknownError: serviceId + '.500.1'
};

module.exports = {

  code: errorCode,

  fileNotProvided: function() {
    return err(400, errorCode.fileNotProvided, 'No file provided', 'Failed to upload, not file was provided');
  },

  invalidFileType: function(file) {
    return err(403, errorCode.invalidFileType, 'File type not allowed', 'File ' + file + ' is not supported');    
  },

  fileTooLarge: function(maxSizeMb) {
    return err(400, errorCode.fileTooLarge, 'File too large', 'Max size is ' + maxSizeMb + 'mb');        
  },

  unknownError: function(detail) {
    return err(500, errorCode.unknownError, 'Unkown error', detail);            
  }

};

function err(status, code, title, detail) {  
  var e = {
    status: status,
    error: {
      code: code,
      id: uuid.v4(),
      title: title
    }
  };

  if(detail) {
    e.error.detail = detail;
  }

  return e;
}

