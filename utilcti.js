var crypto = require('crypto');

// send http 401 unauthorized response
exports.send401 = function (resp) {
    try {
        resp.writeHead(401);
        resp.end();
    } catch (err) {
	console.log(err.stack);
    }
}

// send http 404 response
exports.send404 = function (resp) {
    try {
        resp.writeHead(404);
        resp.end();
    } catch (err) {
	console.log(err.stack);
    }
}

// send http 500 response: Internal Server Error
exports.send500 = function (resp) {
    try {
        resp.writeHead(500);
        resp.end();
    } catch (err) {
	console.log(err.stack);
    }
}

// send http 503 response: Service Unavailable
exports.send503 = function (resp) {
    try {
        resp.writeHead(503);
        resp.end();
    } catch (err) {
	console.log(err.stack);
    }
}

// return nonce with SHA1
exports.nonce = function () {
    try {
        var shasum = crypto.createHash('sha1');
        var time = new Date().getTime();
        var random = crypto.randomBytes(256) + time;
        var hash = shasum.update(random).digest('hex');
        return hash;
    } catch (err) {
	console.log(err.stack);
    }
}
