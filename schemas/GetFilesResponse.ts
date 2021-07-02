export default {
	id: "GetFilesResponse",
	description: "Response for the list objects in the bucket",
	additionalProperties: false,
	properties: {
		files: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					key: {
						type: "string",
						description: "object key"
					}
				},
				required: ["key"]
			}
		}
	}
}
