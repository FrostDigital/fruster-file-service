import uuid from "uuid";

const serviceId = "file-service";

const errorCode = {
	fileNotProvided: serviceId + ".400.1",
	fileTooLarge: serviceId + ".400.2",
	invalidFileType: serviceId + ".403.1",
	unknownError: serviceId + ".500.1"
};

export default {

	code: errorCode,

	fileNotProvided: function () {
		return err(400, errorCode.fileNotProvided, "No file provided", "Failed to upload, no file was provided - is file part named 'file'?");
	},

	invalidFileType: function (file: string) {
		return err(403, errorCode.invalidFileType, "File type not allowed", "File " + file + " is not supported");
	},

	fileTooLarge: function (maxSizeMb: number | string) {
		return err(400, errorCode.fileTooLarge, "File too large", "Max size is " + maxSizeMb + "mb");
	},

	unknownError: function (detail: string) {
		return err(500, errorCode.unknownError, "Unkown error", detail);
	}

};

function err(status: number, code: string, title: string, detail: string) {
	const e = {
		status: status,
		error: {
			code: code,
			id: uuid.v4(),
			title: title,
			detail: detail || undefined
		}
	};
	
	return e;
}

