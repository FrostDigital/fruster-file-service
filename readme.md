# Fruster File Service

Upload files to S3.

## REST API

Note that file service is slightly different compared to other Fruster services since it runs a web server and exposes an upload HTTP endpoint itself. 

This is done simply because NATS is not good at handling large amount of data, such as large files.

### POST /upload

Performs a multipart form upload.

#### Params

* file - the file to send

#### Failure response

* 400 / 400.1 File not provided
* 400 / 400.2 File to large
* 403 / 403.1 Invalid file type
* 500 / 500.1 Unknown error

## Configuration

    // NATS servers, set multiple if using cluster
    // Example: `['nats://10.23.45.1:4222', 'nats://10.23.41.8:4222']`
    bus: parseArray(process.env.BUS) || ['nats://localhost:4222'],

    // HTTP port
    port: process.env.HTTP_PORT || 3001,

    // AWS S3 access key
    s3AccessKey: process.env.S3_ACCESS_KEY || 'AKIAJPEXVPNKCC2H35AQ',

    // AWS S3 secret key
    s3Secret: process.env.S3_SECRET || '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',

    // Name of S3 bucket
    s3Bucket: process.env.S3_BUCKET || 'fruster-uploads',

    // ACL for uploaded files, defaults to public-read which will make
    // uploaded files public
    s3Acl: process.env.S3_ACL || 'public-read',

    // Max file size of uploaded files in mb 
    maxFileSize: process.env.MAX_FILE_SIZE_MB || 5