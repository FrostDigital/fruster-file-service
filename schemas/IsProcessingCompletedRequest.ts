export default {
    id: "IsProcessingCompletedRequest",
    description: "Request to check if video processing completed",
    additionalProperties: false,
    properties: {
        url: {
            description: "The url to the file.",
            type: "string",
            format: "uri"
        }
    }
}
