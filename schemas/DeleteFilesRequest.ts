const ObjectIdentifer = {
	type: "object",
	additionalProperties: false,
	properties: {
		key: {
			type: "string",
			description: "Key name of the object."
		},
		version: {
			type: "string",
			description: "used to reference a specific version of the object"
		}
	},
	required: ["key"]
}

export default {
	id: "DeleteFilesRequest",
	description: "Request object for delete a file from s3 bucket",
	additionalProperties: false,
	properties: {
		url: {
			description: "The url to the file.",
			type: "string",
			format: "uri"
		},
		urls: {
			description: "The urls to the file.",
			type: "array",
			items: {
				type: "string",
				format: "uri"
			},
			minItems: 1
		},
		file: ObjectIdentifer,
		files: {
			description: "file keys and versions of the files",
			type: "array",
			items: ObjectIdentifer
		}
	}
}
