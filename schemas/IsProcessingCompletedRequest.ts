export default {
    "id": "IsProcessingCompletedRequest",
    "description": "Request object for check video processing completed",
    "additionalProperties": false,
    "properties": {
        "url": {
            "description": "The url to the file.",
            "type": "string",
            "format": "uri"
        }
    }
}
