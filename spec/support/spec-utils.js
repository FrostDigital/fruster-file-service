const request = require("request");
const fs = require("fs");
const log = require("fruster-log");
const Request = require("../../node_modules/express/lib/request.js");


module.exports = {

    post,
    get,
    removeFilesInDirectory

};


/**
 * @param {String} baseUri
 * @param {String} path 
 * @param {String|Array<String>} imageNames 
 * 
 * @return {Promise}
 */
async function post(baseUri, path, imageNames) {
    const formData = {};

    if (imageNames) {
        if (Array.isArray(imageNames)) {
            formData.files = formData.map(file => fs.createReadStream(__dirname + "/" + imageNames));
        } else {
            formData.file = fs.createReadStream(__dirname + "/" + imageNames);
        }
    }

    return new Promise((resolve, reject) => {
        const postRequest = request.post({
            url: baseUri + path,
            formData: formData
        }, (err, resp, body) => {
            postRequest.end();

            if (err)
                reject(err);
            else {
                resp.body = body ? JSON.parse(body) : {};
                resolve(resp);
            }
        });
    });
}


/**
 * @param {String} baseUri
 * @param {String=} path 
 * 
 * @return {Promise}
 */
async function get(baseUri, path) {
    const url = !!path ? baseUri + path : baseUri;
    const formData = {};

    return new Promise((resolve, reject) => {
        const getRequest = request.get({
            url: url
        }, (err, resp, body) => {
            getRequest.end();

            if (err)
                reject(err);
            else {
                try {
                    resp.body = body ? JSON.parse(body) : {};
                    resolve(resp);
                } catch (err) {
                    resolve(resp);
                }
            }
        });
    });

}

/**
 * @param {String} dirPath 
 */
function removeFilesInDirectory(dirPath) {
    let files;

    try {
        files = fs.readdirSync(dirPath);
    } catch (e) {
        return;
    }

    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            let filePath = dirPath + '/' + files[i];

            if (fs.statSync(filePath).isFile()) {
                try {
                    fs.unlinkSync(filePath);
                } catch (err) {
                    log.error(err);
                }
            } else {
                removeFilesInDirectory(filePath);
            }
        }
    }
};