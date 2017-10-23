/**
 * Repository for storing image urls in memory to speed up fetching/proxying of rescaled images.
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
        if (this.repo[imageName]) {
            return this.repo[imageName][InMemoryImageCacheRepo._queryToString(query)];
        }
    }

    /**
     * Adds a <imageName, <query, url>> entry
     * 
     * @param {String} imageName 
     * @param {Object} query 
     * @param {String} url 
     */
    add(imageName, query, url) {
        if (!this.repo[imageName]) {
            this.repo[imageName] = {}
        }

        this.repo[imageName][InMemoryImageCacheRepo._queryToString(query)] = url;
    }

    /**
     * Stringifies query to be used for in memory storage.
     * 
     * @param {Object} query 
     */
    static _queryToString(query) {
        const width = query.width || null;
        const height = query.height || null;

        return `width:${width},height:${height}`;
    }

}

module.exports = InMemoryImageCacheRepo;