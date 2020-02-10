const conf = require("../conf");

module.exports = {

	serviceName: conf.serviceName,

	temporaryImageLocation: "./images",

	endpoints: {

		http: {

			UPLOAD_FILE: "/upload",

			HEALTH: "/health",

			GET_IMAGE: "/image/:imageName",

			bus: {

				UPLOAD_FILE: `http.post.${conf.serviceName}.upload`,

				GET_IMAGE: `http.get.${conf.serviceName}.image.:imageName.:type`,

				UPDATE_IMAGE: `http.put.${conf.serviceName}.image.:imageName`,

				HEALTH: `http.get.${conf.serviceName}.health`

			}

		},

		service: {

			GET_SIGNED_URL: `${conf.serviceName}.get-signed-url`,
			GET_IMAGE_PROXY_CACHE: `${conf.serviceName}.get-image-proxy-cache`,
			DELETE_FILE: `${conf.serviceName}.delete-file`,

		}

	},

	schemas: {

		request: {
			DELETE_FILES: "DeleteFilesRequest",
			UPDATE_IMAGE: "UpdateImageRequest"
		},

		response: {
			UPLOAD_FILE: "UploadFileResponse",
			GET_SIGNED_URL: "GetSignedUrlResponse",
			UPDATE_IMAGE: "UpdateImageResponse"
		}
	}

};
