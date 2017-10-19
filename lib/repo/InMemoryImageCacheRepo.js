class InMemoryImageCacheRepo {

    constructor() {
        this.repo = {};
    }

    /**
     * @param {String} imageName 
     * @param {Object} query 
     */
    get(imageName, query) {
        if (this.repo[imageName]) {
            return this.repo[imageName][this._queryToString(query)];
        }
    }

    /**
     * @param {String} imageName 
     * @param {Object} query 
     * @param {String} url 
     */
    add(imageName, query, url) {
        if (!this.repo[imageName]) {
            this.repo[imageName] = {}
        }

        this.repo[imageName][this._queryToString(query)] = url;
    }

    _queryToString(query) {
        return `width:${query.width},height:${query.height}`;
    }

}

module.exports = InMemoryImageCacheRepo;