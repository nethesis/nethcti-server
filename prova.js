var fs = require('fs');
var path = require('path');
var util = require('util');

var str = '/home/ale/insstall';

path.exists(str, function(exists){
	util.debug(exists ? "yes": "no");
});
