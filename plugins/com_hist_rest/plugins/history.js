var http = require('http');
var querystring = require('querystring');
var histreq = require('../dataCollector.js');
var utilcti = require('../../../utilcti.js');

(function(){

    var _priv = {
        dcori: undefined // original dataCollector
    };

    (function init() {
        _priv.dcori = new histreq.DataCollector();
    })();

    var history = {

        routes : {
            'root': 'history',
            'get' : [
		'interval/:ext/:datefrom/:dateto',
		'interval/:ext/:datefrom/:dateto/:filter'
	    ],
            'post': [],
            'head': [],
            'del' : []
        },

        interval: function (req, res, next) {

	    try {
		console.log(req.params);
		var filter = req.params.filter === undefined ? '%' : req.params.filter;
		console.log("filter = " + filter);

		// check http header
                if (!req.headers.authorization) {
                    console.log("send 401");
                    utilcti.send401(res);
                    return;
                }

                var ext = req.params.ext;
                var datefrom = req.params.datefrom;
                var dateto = req.params.dateto;
            
	        // http post authentication to authenticator module
                var options = {
                    port: 9001,
                    method: 'POST',
                    host: 'localhost',
                    path: '/authenticator/auth/' + ext + '/' + req.headers.authorization
                };

                var postReq = http.request(options, function (postResp) {
                
                    postResp.setEncoding('utf8');
    
                    postResp.on('data', function (str) {
                        obj = JSON.parse(str);

                        if (obj.result === true) {
                            _priv.dcori.getIntervalHistoryCall(ext, datefrom, dateto, filter, function (results) {
				res.send(results);
                                res.end();
                            });
    
                        } else {
        		    utilcti.send401(res);
                        }
	            });
                });

		postReq.on('error', function (err) {
		    console.log(err.stack);
		    utilcti.send503(res);
		    return;
		});
		postReq.end();

	    } catch (err) {
		console.log(err.stack);
		utilcti.send500(res);
	    }
        }
    }
   
    exports.routes = history.routes;
    exports.interval = history.interval;
})();
