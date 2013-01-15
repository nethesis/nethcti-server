var crypto = require('crypto');
var authreq = require('../ori/authenticator.js');
var utilcti = require('../../../utilcti.js');

(function(){

    var _priv = {
	EXPIRES: 60000, // msec
        authori: undefined,
        tempGrants: {}
    };

    (function init() {
        _priv.authori = new authreq.Authenticator();
    })();

    var authenticator = {

        routes : {
            'root': 'authenticator',
            'get' : [''],
            'post': ['auth/:user', 'auth/:user/:token'],
            'head': [],
            'del' : []
        },

        auth: function (req, res, next) {

	    try {

                var user = req.params.user;
                var token = req.params.token ? req.params.token : undefined;

		// send 401 response with nonce
                if (!token) {

		    var pwd = _priv.authori.getPasswordUser(user);

		    // generate nonce
		    var nonce = utilcti.nonce();

		    // generate token with HMAC-SHA1
		    var tohash = user + ':' + pwd + ':' + nonce;
		    var token = crypto.createHmac('sha1', pwd).update(tohash).digest('hex');

		    // store temporary grants
	            _priv.tempGrants[user] = {
			password: pwd,
	                nonce: nonce,
			token: token,
	                expires: new Date().getTime() + _priv.EXPIRES
	            };
		
		    // send 401 response with nonce into the http header
	            send401Nonce(res, nonce);

                } else { // check authentication http header
                
		    // check presence of temporary grants
		    if (!_priv.tempGrants[user]) {
		        res.send({ result: false });
		        return;
		    }
                
		    // get temporary token grant
		    var tokenGrant = _priv.tempGrants[user].token;

		    // check token
		    if (token !== tokenGrant) {
		        res.send({ result: false });
		        return;
		    }
		
		    // check expiration
		    if (new Date().getTime() > _priv.tempGrants[user].expires) {
		        res.send({ result: false });
		        return;
		    }

		    // update expiration
		    _priv.tempGrants[user].expires = new Date().getTime() + _priv.EXPIRES;

		    res.send({ result: true });
	        }

	    } catch (err) {
		console.log(err.stack);
	    }
	}
    }
   
    exports.routes = authenticator.routes;
    exports.auth = authenticator.auth;

})();

function send401Nonce(resp, nonce) {
    try {
        resp.writeHead(401, { 'WWW-Authenticate': 'Digest ' + nonce });
        resp.end();
    } catch (err) {
	console.log(err.stack);
    }
}
