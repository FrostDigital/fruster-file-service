module.exports = {
  // NATS servers, set multiple if using cluster
  // Example: `['nats://10.23.45.1:4222', 'nats://10.23.41.8:4222']`
  bus: parseArray(process.env.BUS) || ['nats://localhost:4222'],

  // HTTP port
  port: process.env.PORT || 3001,

  // Name of S3 bucket
  s3Bucket: process.env.S3_BUCKET || 'fruster-uploads',

  // AWS Access key id
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "AKIAJPEXVPNKCC2H35AQ",

  // AWS Secret access key
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET || "0KK41oXRPZItRrhuwh+Sd+cfq2EntJXN4UHZpNrq",

  // ACL for uploaded files, defaults to public-read which will make
  // uploaded files public
  s3Acl: process.env.S3_ACL || 'public-read',

  // Max file size of uploaded files in mb 
  maxFileSize: process.env.MAX_FILE_SIZE_MB || 5,

  serviceName: process.env.SERVICE_NAME || "file-service",

  mustBeLoggedIn: parseBool(process.env.MUST_BE_LOGGED_IN || "false")
}

module.exports.serviceHttpUrl = process.env.HOSTNAME ? 'http://' + process.env.DEIS_APP + '.' + process.env.DEIS_APP : 'http://localhost:' + module.exports.port;

function parseArray(str) {
  if (str) {
    return str.split(',');
  }
  return null;
}

function parseBool(str) {
  return str == "true" || parseInt(str) == 1;
}