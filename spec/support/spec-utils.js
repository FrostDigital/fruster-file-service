const request = require("request");
const fs = require("fs");

module.exports = {

    post,
    get

};


/**
 * @param {String} baseUri
 * @param {String} path 
 * @param {String} imageNames 
 * @param {Function} cb 
 */
function post(baseUri, path, imageNames, cb) {
    const formData = {};

    if (imageNames) {
        if (Array.isArray(imageNames)) {
            formData.files = formData.map(file => fs.createReadStream(__dirname + "/" + imageNames));
        } else {
            formData.file = fs.createReadStream(__dirname + "/" + imageNames);
        }
    }

    const postRequest = request.post({
        url: baseUri + path,
        formData: formData
    }, (err, resp, body) => {
        postRequest.end();
        cb(err, resp, body ? JSON.parse(body) : {});
    });
}


/**
 * @param {String} baseUri
 * @param {String=} path 
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
            else
                resolve(body ? JSON.parse(body) : {});
        });
    });

}

