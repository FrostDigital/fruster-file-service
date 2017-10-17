const conf = require("../conf");

module.exports = {

    endpoints: {

        http: {

            UPLOAD_FILE: "/upload",

            UPLOAD_RESIZED_IMAGE: "/upload-resized-image",

            HEALTH: "/health",

            GET_IMAGE: "/image/:imageName",

            bus: {

                GET_SIGNED_URL: `${conf.serviceName}.get-signed-url`,

                UPLOAD_FILE: `http.post.${conf.serviceName}.upload`,

                HEALTH: `http.get.${conf.serviceName}.health`

            }

        }

    }

};