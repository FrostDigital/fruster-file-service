import conf from "../../conf";

/**
 * Repository for keep video processing finished status and thumbnail creating finished status.
 * This is needed to delete input video file after finished all processing
 */
class InMemoryVideoCacheRepo {

	repo = new Map<string, boolean>();

	// /**
	//  * Gets an url entry based on imageName and query.
	//  */
	// get(imageName:string, query: ImageQuery) {
	// 	return this.repo.get(this.getCacheKey(imageName, query));
	// }

	/**
	 * Add video file to repo if thumbnails is configured.
	 * If this function return false video file possible to delete,
	 * otherwise need to wait until finish other process
	 * @returns {Boolean} if file added to the repo return true, otherwise false
	 */
	add(videoFileName: string) {
		if (conf.noOfThumbnails === 0)
			return false;

		if (this.repo.get(videoFileName)) {
			this.repo.delete(videoFileName);
			return false;
		}

		this.repo.set(videoFileName, true);
		return true;
	}

}

export default  InMemoryVideoCacheRepo;
