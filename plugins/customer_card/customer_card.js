/**
* Provides the customer card functions.
*
* @module customer_card
* @main customer_card
*/
var fs    = require('fs');
var ejs   = require('ejs');
var path  = require('path');
var async = require('async');

/**
* Provides the customer card functionalities.
*
* @class customer_card
* @static
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [customer_card]
*/
var IDLOG = '[customer_card]';

/**
* The default directory of the customer cards templates.
*
* @property DEFAULT_TEMPLATES_DIR
* @type string
* @private
* @final
* @readOnly
* @default "templates/locales/it"
*/
var DEFAULT_TEMPLATES_DIR = 'templates/locales/it';

/**
* The directory path of the custom templates used by the customer card component. All
* templates in this path are more priority than the default ones.
*
* @property customTemplatesPath
* @type string
* @private
*/
var customTemplatesPath;

/**
* The logger. It must have at least three methods: _info, warn and error._
*
* @property logger
* @type object
* @private
* @default console
*/
var logger = console;

/**
* The dbconn module.
*
* @property dbconn
* @type object
* @private
*/
var dbconn;

/**
* The authorization architect component used for customer card functions.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

/**
* The HTTP proxy architect component.
*
* @property compHttpProxy
* @type object
* @private
*/
var compHttpProxy;

/**
* All the ejs templates used for the customer cards. The keys are the name of the
* customer card and the values are objects. These objects have two keys:
*
* + _index:_ the sequence used to show the customer card in order
* + _content:_ the content of the customer card
*
* @property ejsTemplates
* @type object
* @private
*/
var ejsTemplates = {};

/**
* Set the logger to be used.
*
* @method setLogger
* @param {object} log The logger object. It must have at least
* three methods: _info, warn and error_ as console object.
* @static
*/
function setLogger(log) {
    try {
        if (typeof log === 'object'
            && typeof log.info  === 'function'
            && typeof log.warn  === 'function'
            && typeof log.error === 'function') {

            logger = log;
            logger.info(IDLOG, 'new logger has been set');

        } else {
            throw new Error('wrong logger object');
        }
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the module to be used for database functionalities.
*
* @method setDbconn
* @param {object} dbConnMod The dbconn module.
*/
function setDbconn(dbconnMod) {
    try {
        // check parameter
        if (typeof dbconnMod !== 'object') { throw new Error('wrong dbconn object'); }
        dbconn = dbconnMod;
        logger.info(IDLOG, 'set dbconn module');
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Gets a customer card.
*
* @method getCustomerCardByNum
* @param {string} ccName The name of the customer card to search
* @param {string} num The number used to search the customer card.
* @param {function} cb The callback function
*/
function getCustomerCardByNum(ccName, num, cb) {
    try {
        // check parameters
        if (typeof num !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        logger.info(IDLOG, 'search customer card ' + ccName + ' by number ' + num + ' by means dbconn module');
        dbconn.getCustomerCardByNum(ccName, num, function (err1, results) {
            try {

                if (err1) {
                    logger.error(IDLOG, 'getting customer card "' + ccName + '" by num "' + num + '"');
                    cb(err1);
                    return;
                }
                var proxyUrl = compHttpProxy.getUrl();

                results.forEach(function (el) {
                    el.server_address = proxyUrl;
                });

                var template = ejsTemplates[ccName].content;
                var render   = ejs.render(template, { results: results });
                var obj = {
                    name:   ccName,
                    index:  ejsTemplates[ccName].index,
                    render: render
                }

                cb(null, obj);

            } catch (error) {
                logger.error(IDLOG, error.stack);
                cb(error);
            }
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component used by customer card functions.
*
* @method setCompAuthorization
* @param {object} ca The authorization architect component.
*/
function setCompAuthorization(ca) {
    try {
        compAuthorization = ca;
        logger.info(IDLOG, 'set authorization architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the HTTP proxy architect component used by customer card functions.
*
* @method setCompHttpProxy
* @param {object} comp The HTTP proxy architect component.
*/
function setCompHttpProxy(comp) {
    try {
        compHttpProxy = comp;
        logger.info(IDLOG, 'set HTTP proxy architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Gets all authorized customer cards of the user.
*
* @method getAllCustomerCards
* @param {string}   username The identifier of the user
* @param {string}   num      The number used to search the customer cards.
* @param {function} cb       The callback function
*/
function getAllCustomerCards(username, num, cb) {
    try {
        // check parameters
        if (typeof username !== 'string'
            || typeof num   !== 'string' || typeof cb !== 'function') {

            throw new Error('wrong parameters');
        }

        // get the list of the authorized customer card. It's an array with
        // the name of customer cards as strings
        var allowedCC = compAuthorization.authorizedCustomerCards(username);
        logger.info(IDLOG, 'user "' + username + '" is authorized to view "' + allowedCC.toString() + '" customer cards');

        var obj = {}; // object with all results

        // parallel execution
        async.each(allowedCC, function (ccName, callback) {

            getCustomerCardByNum(ccName, num, function (err, result) { // get one customer card
                try {
                    if (err) { // some error in the query
                        logger.error(IDLOG, err);

                    } else { // add the result
                        obj[result.index] = {
                            name:   result.name,
                            render: result.render,
                            number: num
                        }
                    }
                    callback();

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    callback();
                }
            });

        }, function (err) {
            if (err) { logger.error(IDLOG, err); }

            var objKeys = Object.keys(obj);
            var str = '';
            var k;
            for (k in obj) {
                str += obj[k].name + ',';
            }
            str = str.substring(0, str.length-1);
            logger.info(IDLOG, objKeys.length + ' customer cards "' + str + '" obtained for user "' + username + '" searching num ' + num);

            cb(null, obj);
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
        cb(err.toString());
    }
}

/**
* Initialize the ejs templates used to render the customer cards.
*
* @method start
*/
function start() {
    try {
        initEjsTemplates();

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Initializes the ejs templates used to render the customer cards. The default templates
* are in the _DEFAULT\_TEMPLATES\_DIR_ but the templates present in _customTemplatesPath_
* are more priority.
*
* @method initEjsTemplates
* @private
*/
function initEjsTemplates() {
    try {
        // get all file names of the custom and default templates
        var customFilenames  = fs.readdirSync(customTemplatesPath);
        var defaultFilenames = fs.readdirSync(path.join(__dirname, DEFAULT_TEMPLATES_DIR));

        // template files to read. The keys are the name of the files
        // and the values are the path of the files
        var filesToRead = {};

        // load all default template files in the filesToRead
        var i;
        var filename;
        var filepath;
        for (i = 0; i < defaultFilenames.length; i++) {

            filename = defaultFilenames[i];
            filepath = path.join(__dirname, DEFAULT_TEMPLATES_DIR, filename);
            filesToRead[filename] = filepath;
        }

        // load all the custom template files in the filesToRead. So this custom files
        // are more priority than the default templates
        for (i = 0; i < customFilenames.length; i++) {

            filename = customFilenames[i];
            filepath = path.join(customTemplatesPath, filename);
            filesToRead[filename] = filepath;
        }

        // read the content of all the ejs templates
        var index;
        var ccname;
        var content;
        for (filename in filesToRead) {

            index    = getCcIndexFromFilename(filename);
            ccname   = getCcNameFromFilename(filename);
            filepath = filesToRead[filename];
            content  = fs.readFileSync(filepath, 'utf8');

            ejsTemplates[ccname] = {
                index:   index,
                content: content
            };
            logger.info(IDLOG, 'ejs template ' + filepath + ' has been read');
        }
        logger.info(IDLOG, 'initialized ejs customer cards templates');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the customer card index from the customer card filename.
*
* @method getCcIndexFromFilename
* @param  {string} filename The name of the file of the customer card template.
* @return {string} The customer card index.
*/
function getCcIndexFromFilename(filename) {
    try {
        // check parameter
        if (typeof filename !== 'string') { throw new Error('wrong parameter'); }
        return filename.split('_')[2];

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Returns the customer card name from the customer card filename.
*
* @method getCcNameFromFilename
* @param  {string} filename The name of the file of the customer card template.
* @return {string} The customer card name.
*/
function getCcNameFromFilename(filename) {
    try {
        // check parameter
        if (typeof filename !== 'string') { throw new Error('wrong parameter'); }

        var ccname = ''; // the customer card name to return

        var temp = filename.split('_')[3]; // get the name field from the filename
        if (temp) {
            ccname = temp.slice(0, -4); // remove .ejs extension from the filename
        }
        return ccname;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return '';
    }
}

/**
* Configures the module by using the specified JSON configuration file.
*
* @method config
* @param {string} path The path of the JSON configuration file
*/
function config(path) {
    try {
        // check parameter
        if (typeof path !== 'string') { throw new Error('wrong parameter'); }

        // check the file existence
        if (!fs.existsSync(path)) {
            logger.error(IDLOG, path + ' doesn\'t exist');
            return;
        }

        var json = require(path);

        // check the configuration file
        if (typeof json !== 'object' || typeof json.custom_templates_customercards !== 'string') {
            logger.error('wrong configuration file ' + path);
            return;
        }

        customTemplatesPath = json.custom_templates_customercards;
        logger.info(IDLOG, 'end configuration by file ' + path);

    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

// public interface
exports.start                = start;
exports.config               = config;
exports.setLogger            = setLogger;
exports.setDbconn            = setDbconn;
exports.setCompHttpProxy     = setCompHttpProxy;
exports.getAllCustomerCards  = getAllCustomerCards;
exports.getCustomerCardByNum = getCustomerCardByNum;
exports.setCompAuthorization = setCompAuthorization;
