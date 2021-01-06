import ImageQuery from "../models/ImageQuery";

/**
 * Repository for storing image urls in memory to speed up fetching/proxying of updated images.
 */
class InMemoryImageCacheRepo {

	repo = new Map<string, string>();

	/**
	 * Gets an url entry based on imageName and query.	
	 */
	get(imageName:string, query: ImageQuery) {
		return this.repo.get(this.getCacheKey(imageName, query));		
	}

	/**
	 * Adds a <imageName, <query, url>> entry
	 *
	 * @param {String} imageName
	 * @param {Object} query
	 * @param {String} url
	 */
	add(imageName:string, query: ImageQuery, url:string) {
		this.repo.set(this.getCacheKey(imageName, query), url);		
	}

	/**
	 * Stringified query to be used for in memory storage.
	 *
	 * @param {Object} query
	 */
	private queryToString({ height, width, angle}: ImageQuery) {
		if (angle)
			return height || width ? `width:${width},height:${height},angle:${angle}` : `angle:${angle}`;
		else if (!angle && (height || width))
			return `width:${width},height:${height}`;
	}

	/**
	 * Creates cache key based on image name and query. 	 
	 * This key is used to query cache to get correct cached image url.
	 */
	getCacheKey(imageName: string, query: ImageQuery) {
		return `${imageName}_${this.queryToString(query)}`
	}

	getAllAsJson() {
		return Object.fromEntries(this.repo);
	}

}

export default  InMemoryImageCacheRepo;
