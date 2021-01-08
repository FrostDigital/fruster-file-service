const serviceSpecificErrors = [
	{ status: 400, code: "FILE_NOT_PROVIDED", title: "No file provided", detail: "Failed to upload, no file was provided - is file part named 'file'?" },
	{ status: 400, code: "INVALID_FILE_TYPE", title: "File type not allowed", detail: (file:string) => "File " + file + " is not supported" },	
	{ status: 400, code: "FILE_TOO_LARGE", title: "File too large", detail: (maxSizeMb:string | number) => "Max size is " + maxSizeMb + "mb" },	
];

export default require("fruster-errors")(serviceSpecificErrors);
