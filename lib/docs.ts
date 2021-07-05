import conf from "../conf";

const internalServerError = "Something unexpected happened.";
const badRequest = "Request has invalid or missing fields.";

const docs = {

	http: {

		UPLOAD_FILE: {
			description: `Uploads a file. Uses multipart data with the file to be uploaded as a form field called 'file'. Max file size is ${conf.maxFileSize} mb. Returns status code 201 on success.`,
			errors: {
				"FILE_NOT_PROVIDED": "No file provided.",
				"FILE_TOO_LARGE": `File too large. Max size is ${conf.maxFileSize} mb`,
				"FILE_TYPE_NOT_ALLOWED": "File type not allowed.",
				INTERNAL_SERVER_ERROR: internalServerError,
				BAD_REQUEST: badRequest
			}
		},

		HEALTH: {
			description: "Gets current health of the service.",
			errors: {
				INTERNAL_SERVER_ERROR: internalServerError,
				BAD_REQUEST: badRequest
			}
		},

		UPDATE_IMAGE: {
			description: "Updates image width, height and/or rotation. Will process images and save in S3.",
			errors: {
				INTERNAL_SERVER_ERROR: internalServerError,
				BAD_REQUEST: badRequest
			}
		},

		GET_FILE: {
			description: "Get file by file key (name)",
			params: {
				fileKey: "The file key that need to get"
			},
			errors: {
				INTERNAL_SERVER_ERROR: internalServerError,
				NOT_FOUND: "File does not exist"
			}
		}

	},

	service: {

		DELETE_FILE: {
			description: "Delete file from s3 bucket",
			errors: {
				INTERNAL_SERVER_ERROR: internalServerError,
				BAD_REQUEST: badRequest
			}
		}

	}

};


export default docs;
