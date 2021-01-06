import conf from "../conf";
import constants from "./constants";

const internalServerError = "Something unexpected happened.";
const badRequest = "Request has invalid or missing fields.";

const docs = {

	http: {

		UPLOAD_FILE: {
			description: `Uploads a file. Uses multipart data with the file to be uploaded as a form field called 'file'. Max file size is ${conf.maxFileSize} mb. Returns status code 201 on success.`,
			errors: {
				"file-service.400.1": "No file provided.",
				"file-service.400.2": `File too large. Max size is ${conf.maxFileSize} mb`,
				"file-service.403.1": "File type not allowed.",
				"file-service.500.1": "Unknown error.",
				[`${constants.serviceName}.INTERNAL_SERVER_ERROR`]: internalServerError,
				[`${constants.serviceName}.BAD_REQUEST`]: badRequest
			}
		},

		HEALTH: {
			description: "Gets current health of the service.",
			errors: {
				"file-service.500.1": "Unknown error.",
				[`${constants.serviceName}.INTERNAL_SERVER_ERROR`]: internalServerError,
				[`${constants.serviceName}.BAD_REQUEST`]: badRequest
			}
		},

		UPDATE_IMAGE: {
			description: "Update image - for rotate an image",
			errors: {
				"file-service.500.1": "Unknown error.",
				[`${constants.serviceName}.INTERNAL_SERVER_ERROR`]: internalServerError,
				[`${constants.serviceName}.BAD_REQUEST`]: badRequest
			}
		}

	},

	service: {

		GET_SIGNED_URL: {
			description: "Gets an temporary url for a file.",
			errors: {
				"file-service.500.1": "Unknown error.",
				[`${constants.serviceName}.INTERNAL_SERVER_ERROR`]: internalServerError,
				[`${constants.serviceName}.BAD_REQUEST`]: badRequest
			}
		},

		DELETE_FILE: {
			description: "Delete file from s3 bucket",
			errors: {
				[`${constants.serviceName}.INTERNAL_SERVER_ERROR`]: internalServerError,
				[`${constants.serviceName}.BAD_REQUEST`]: badRequest
			}
		}

	}

};


export default docs;