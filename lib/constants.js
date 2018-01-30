const conf = require("../conf");

module.exports = {

    serviceName: conf.serviceName,

    temporaryImageLocation: "./images",

    endpoints: {

        http: {

            UPLOAD_FILE: "/upload",

            UPLOAD_RESIZED_IMAGE: "/upload-resized-image",

            HEALTH: "/health",

            GET_IMAGE: "/image/:imageName",

            bus: {

                UPLOAD_FILE: `http.post.${conf.serviceName}.upload`,

                GET_IMAGE: `http.get.${conf.serviceName}.image.:imageName.:type`,

                HEALTH: `http.get.${conf.serviceName}.health`

            }

        },

        service: {

            GET_SIGNED_URL: `${conf.serviceName}.get-signed-url`,
            GET_IMAGE_PROXY_CACHE: `${conf.serviceName}.get-image-proxy-cache`

        }

    }

};