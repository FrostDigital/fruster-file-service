export type ListObjectResponse = {
	files: { key: string }[]; //TODO: This will possible to improve, if need pagination, and more data from the objects
};
