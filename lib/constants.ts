import conf from "../conf";
import DeleteFilesRequest from "../schemas/DeleteFilesRequest";
import os from "os";
import path from "path";

export default {

	serviceName: conf.serviceName,

	temporaryImageLocation: path.join(os.tmpdir(), "images"),

	temporaryVideoLocation: path.join(os.tmpdir(), "videos"),

	temporaryUploadLocation: path.join(os.tmpdir(), "uploads"),

	endpoints: {

		http: {

			UPLOAD_FILE: "/upload",

			HEALTH: "/health",

			GET_IMAGE: "/image/:imageName*",

			GET_FILE: "/file/:fileKey*",

			bus: {

				UPLOAD_FILE: `http.post.${conf.httpBasePath.replace(/\//g, ".").toLowerCase()}.upload`,

				UPDATE_IMAGE: `http.put.${conf.httpBasePath.replace(/\//g, ".").toLowerCase()}.image.:imageName`,

				HEALTH: `http.get.${conf.httpBasePath.replace(/\//g, ".").toLowerCase()}.health`

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
			DELETE_FILES: DeleteFilesRequest,
			UPDATE_IMAGE: "UpdateImageRequest"
		},

		response: {
			UPLOAD_FILE: "UploadFileResponse",
			GET_SIGNED_URL: "GetSignedUrlResponse",
			UPDATE_IMAGE: "UpdateImageResponse"
		}
	}

};
