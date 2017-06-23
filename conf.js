module.exports = {
  // NATS servers, set multiple if using cluster
  // Example: `['nats://10.23.45.1:4222', 'nats://10.23.41.8:4222']`
  bus: parseArray(process.env.BUS) || ['nats://localhost:4222'],

  // HTTP port
  port: getPort(),

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

  mustBeLoggedIn: parseBool(process.env.MUST_BE_LOGGED_IN || "false"),

  serviceHttpUrl: getServiceHttpUrl()
};

function parseArray(str) {
  if (str) {
    return str.split(',');
  }
  return null;
}

function parseBool(str) {
  return str == "true" || parseInt(str) == 1;
}

function getPort() {
  return process.env.PORT || 3410;
}

function getServiceHttpUrl() {

  if(process.env.DEIS_APP) {
    return `http://${process.env.DEIS_APP}.${process.env.DEIS_APP}`;
  }

  if(process.env.DOCKER_HOSTNAME) {
    return `http://${process.env.DOCKER_HOSTNAME}:${getPort()}`;
  }

  return `http://localhost:${getPort()}`;
}