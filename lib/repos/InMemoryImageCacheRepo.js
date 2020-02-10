/**
 * Repository for storing image urls in memory to speed up fetching/proxying of updated images.
 */
class InMemoryImageCacheRepo {

	constructor() {
		this.repo = {};
	}

	/**
	 * Gets an url entry based on imageName and query.
	 *
	 * @param {String} imageName
	 * @param {Object} query
	 */
	get(imageName, query) {
		if (this.repo[imageName])
			return this.repo[imageName][this._queryToString(query)];
	}

	/**
	 * Adds a <imageName, <query, url>> entry
	 *
	 * @param {String} imageName
	 * @param {Object} query
	 * @param {String} url
	 */
	add(imageName, query, url) {
		if (!this.repo[imageName])
			this.repo[imageName] = {}

		this.repo[imageName][this._queryToString(query)] = url;
	}

	/**
	 * Stringified query to be used for in memory storage.
	 *
	 * @param {Object} query
	 */
	_queryToString({ height = null, width = null, angle = null }) {
		if (height || width)
			return `width:${width},height:${height}`;
		else
			return `angle:${angle}`;
	}

}

module.exports = InMemoryImageCacheRepo;
