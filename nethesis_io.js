var fs = require('fs');
var path = require('path');
var log4js = require('./lib/log4js-node/lib/log4js')();
var logger = log4js.getLogger('[nethesis_io]'); // logger
//logger.setLevel('ERROR'); // default log level
// set the logger level and the log file in which it writes
exports.setLogger = function(logfile,level){	
        log4js.addAppender(log4js.fileAppender(logfile), '[nethesis_io]');
        logger.setLevel(level);
}
/* Delete all files into 'dirpath' directory (not recursively) 
 * with the given filename and any extension. Return true if 
 * all files with any extensions are successfully deleted. 
 * Return false if at least one removal fails */
exports.deleteAllFiles = function(dirpath,filename){
	var files = fs.readdirSync(dirpath);
        var filenameTemp = '';
        var fileExtTemp = '';
        var nameTemp = '';
        var filepathToDelTemp = '';
        for(var i=0; i<files.length; i++){
                filenameTemp = files[i];
                fileExtTemp = filenameTemp.split('.')[1];
                nameTemp = filenameTemp.split('.')[0];
                if(filename===nameTemp){
                        filepathToDelTemp = path.join(dirpath,filenameTemp);
                        try {
                                fs.unlinkSync(filepathToDelTemp);
                               	logger.debug('voicemail "' + filepathToDelTemp + '" deleted');
                        } catch(error) {
                                logger.error('error deleting voicemail "' + filepathToDelTemp + '": ' + error.message);
                                return false;
                        }
                }
        }
        return true;
}
