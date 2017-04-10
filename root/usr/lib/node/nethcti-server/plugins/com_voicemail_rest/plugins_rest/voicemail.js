/**
* Provides voicemail functions through REST API.
*
* @module com_voicemail_rest
* @submodule plugins_rest
*/

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins_rest/voicemail]
*/
var IDLOG = '[plugins_rest/voicemail]';

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
* The voicemail architect component used for voicemail functions.
*
* @property compVoicemail
* @type object
* @private
*/
var compVoicemail;

/**
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* The architect component to be used for user.
*
* @property compUser
* @type object
* @private
*/
var compUser;

/**
* The http static module.
*
* @property compStaticHttp
* @type object
* @private
*/
var compStaticHttp;

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
* Set voicemail architect component used by voicemail functions.
*
* @method setCompVoicemail
* @param {object} cp The voicemail architect component.
*/
function setCompVoicemail(cp) {
    try {
        compVoicemail = cp;
        logger.info(IDLOG, 'set voicemail architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the utility architect component.
*
* @method setCompUtil
* @param {object} comp The utility architect component.
*/
function setCompUtil(comp) {
    try {
        compUtil = comp;
        logger.info(IDLOG, 'set util architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set the user architect component.
*
* @method setCompUser
* @param {object} comp The architect user component
* @static
*/
function setCompUser(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compUser = comp;
        logger.log(IDLOG, 'user component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

/**
* Set static http architecht component used by history functions.
*
* @method setCompStatic
* @param {object} comp The http static architect component.
*/
function setCompStaticHttp(comp) {
    try {
        compStaticHttp = comp;
        logger.info(IDLOG, 'set http static component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Sets the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The architect authorization component
* @static
*/
function setCompAuthorization(comp) {
    try {
        // check parameter
        if (typeof comp !== 'object') { throw new Error('wrong parameter'); }

        compAuthorization = comp;
        logger.log(IDLOG, 'authorization component has been set');

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}

(function(){
    try {
        /**
        * REST plugin that provides voicemail functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`voicemail/list/:type[?offset=n&limit=n]`](#listget)
        * 1. [`voicemail/listen/:id`](#listenget)
        * 1. [`voicemail/new_counters`](#new_countersget)
        * 1. [`voicemail/download/:id`](#downloadget)
        *
        * ---
        *
        * ### <a id="listget">**`voicemail/list/:type[?offset=n&limit=n]`**</a>
        *
        * Returns the list of all voicemail messages of the user.
        * If type is specified returns only messages of the specified type.
        * It supports pagination through offset and limit.
        *
        * Example JSON response:
        *
        *     {
                "count": 39,
                "rows": [
                  {
                    "origtime": "1490350880",
                    "duration": "14",
                    "id": 961,
                    "dir": "/var/spool/asterisk/voicemail/default/230/Old",
                    "callerid": "\"UNIONTEL SRL\" <0521292626>",
                    "mailboxuser": "302",
                    "type": "old"
                  },
        *
        * ---
        *
        * ### <a id="listenget">**`voicemail/listen/:id`**</a>
        *
        * The user can listen the voice message of the user. The _id_ must be the identifier of the voice message in the database.
        *
        * ---
        *
        * ### <a id="new_countersget">**`voicemail/new_counters`**</a>
        *
        * Returns the number of the new voice messages of all voicemails.
        *
        * Example JSON response:
        *
        *     {
         "602": {
              "newMessageCount": "0"
         },
         "605": {
              "newMessageCount": "0"
         },
         "608": {
              "newMessageCount": "0"
         },
         "609": {
              "newMessageCount": "1"
         },
         "614": {
              "newMessageCount": "0"
         },
         "615": {
              "newMessageCount": "0"
         }
     }
        *
        * ---
        *
        * ### <a id="downloadget">**`voicemail/download/:id`**</a>
        *
        * The user can download the voice message of the user. The _id_ must be the identifier of the voice message in the database..
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`voicemail/delete`](#deletepost)
        *
        * ---
        *
        * ### <a id="deletepost">**`voicemail/delete`**</a>
        *
        * Delete the specified voicemail message. The request must contains the following parameters:
        *
        * * `id: the voice message identifier of the database`
        *
        * Example JSON request parameters:
        *
        *     { "id": "74" }
        *
        * @class plugin_rest_voicemail
        * @static
        */
        var voicemail = {

            // the REST api
            api: {
                'root': 'voicemail',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} list/:type[?offset=n&limit=n]   To get the list of all voicemail messages of the user
                *   @param {string} listen/:id   To listen the voicemail message of the user
                *   @param {string} download/:id To download the voicemail message of the user
                *   @param {string} new_counters To get the number of new voice messages of all voicemails
                */
                'get' : [
                    'list/:type',
                    'listen/:id',
                    'download/:id',
                    'new_counters'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} delete To delete a voicemail messages of the user
                */
                'post': [ 'delete' ],
                'head': [],
                'del' : []
            },

            /**
            * Gets the list of all voicemail messages of the user with the following REST API:
            *
            *     list
            *
            * @method list
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            list: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;
                    var type = req.params.type;
                    var offset = req.params.offset;
                    var limit = req.params.limit;

                    // use voicemail component
                    compVoicemail.getVoiceMessagesByUser(username, type, offset, limit, function (err, results) {
                        try {
                            if (err) {
                                logger.error(IDLOG, 'getting all voice messages of user "' + username + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                                return;
                            }

                            logger.info(IDLOG, 'send the number of voice messages of all voicemailes to user ' + username);
                            res.send(200, results);
                        } catch (error) {
                            logger.error(IDLOG, error.stack);
                            compUtil.net.sendHttp500(IDLOG, res, error.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Gets the number of new voice messages of all voicemails with the following REST API:
            *
            *     new_counters
            *
            * @method new_counters
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            new_counters: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // check if the user has the "extension" authorization
                    if (/*compAuthorization.authorizeOpExtensionsUser(username)*/ true !== true) {
                        logger.warn(IDLOG, 'requesting new voice message counter of all voicemails: authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    compVoicemail.getAllNewVoiceMessageCount(function (err1, results) {
                        try {
                            if (err1) {
                                logger.error(IDLOG, 'getting the number of new voice messages of all voicemailes for user "' + username + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                                return;
                            }

                            logger.info(IDLOG, 'send the number of new voice messages of all voicemailes to user "' + username + '"');
                            res.send(200, results);

                        } catch (error) {
                            logger.error(IDLOG, error.stack);
                            compUtil.net.sendHttp500(IDLOG, res, error.toString());
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Listen the voicemail message of the user with the following REST API:
            *
            *     listen
            *
            * @method listen
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            listen: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // get the voicemail identifier (mailbox) from the voicemail database identifier.
                    // This is for the authorization check
                    compVoicemail.getVmIdFromDbId(req.params.id, function (err1, vmid) {
                        try {
                            if (err1) {
                                logger.error(IDLOG, 'listening voice message: getting voicemail id (mailbox) from db voice message id "' + req.params.id + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                                return;
                            }

                            // check the authorization to listen the voice message checking if the voicemail endpoint is owned by the user
                            if (compUser.hasVoicemailEndpoint(username, vmid) !== true) {
                                logger.warn(IDLOG, 'user "' + username + '" tried to listen voice message with db id "' + req.params.id + '" of the voicemail "' + vmid + '" not owned by him');
                                compUtil.net.sendHttp403(IDLOG, res);
                                return;
                            }

                            // listen the voice message
                            compVoicemail.listenVoiceMessage(req.params.id, function (err2, result) {
                                try {
                                    if (err2) {
                                        logger.error(IDLOG, 'listening voice message with id "' + req.params.id + '" of the voicemail "' + vmid + '" by the user "' + username + '"');
                                        compUtil.net.sendHttp500(IDLOG, res, err2.toString());
                                        return;
                                    }

                                    logger.info(IDLOG, 'listen voice message with id "' + req.params.id + '" of the voicemail "' + vmid + '" successfully by the user "' + username + '"');
                                    res.send(200, result);

                                } catch (err3) {
                                    logger.error(IDLOG, err3.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err3.toString());
                                }
                            });

                        } catch (error) {
                            logger.error(IDLOG, error.stack);
                            compUtil.net.sendHttp500(IDLOG, res, error.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Download the voice message of the user with the following REST API:
            *
            *     download
            *
            * @method download
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            download: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // get the voicemail identifier (mailbox) from the voicemail database identifier.
                    // This is for the authorization check
                    compVoicemail.getVmIdFromDbId(req.params.id, function (err1, vmid) {
                        try {
                            if (err1) {
                                logger.error(IDLOG, 'downloading voice message: getting voicemail id (mailbox) from db with voice message id "' + req.params.id + '" by user "' + username + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                                return;
                            }

                            // check the authorization to download the voice message checking if the voicemail endpoint is owned by the user
                            if (/*compUser.hasVoicemailEndpoint(username, vmid)*/ true !== true) {
                                logger.warn(IDLOG, 'user "' + username + '" has tried to download voice message with db id "' + req.params.id + '" of the voicemail "' + vmid + '" not owned by him');
                                compUtil.net.sendHttp403(IDLOG, res);
                                return;
                            }

                            // download the voice message
                            compVoicemail.listenVoiceMessage(req.params.id, function (err2, result) {
                                try {
                                    if (err2) {
                                        logger.error(IDLOG, 'downloading voice message with id "' + req.params.id + '" of the voicemail "' + vmid + '" by the user "' + username + '"');
                                        compUtil.net.sendHttp500(IDLOG, res, err2.toString());
                                        return;
                                    }

                                    logger.info(IDLOG, 'download voice message with id "' + req.params.id + '" of the voicemail "' + vmid + '" successfully by the user "' + username + '"');
                                    var filename = "voicemail" + req.params.id + username + "tmpaudio.wav";
                                    compStaticHttp.saveFile(filename, result);
                                    res.send(200, filename);

                                } catch (err3) {
                                    logger.error(IDLOG, err3.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err3.toString());
                                }
                            });

                        } catch (error) {
                            logger.error(IDLOG, error.stack);
                            compUtil.net.sendHttp500(IDLOG, res, error.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },


            /**
            * Gets the list of all voicemail messages of the user with the following REST API:
            *
            *     delete
            *
            * @method delete
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            delete: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // get the voicemail identifier (mailbox) from the voicemail database identifier.
                    // This is for authorization check
                    compVoicemail.getVmIdFromDbId(req.params.id, function (err1, vmid) {
                        try {

                            if (err1) {
                                logger.error(IDLOG, 'deleting voice message: getting voicemail id (mailbox) from db voice message id "' + req.params.id + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                                return;
                            }

                            // check the authorization to delete the voice message checking if the voicemail endpoint is owned by the user
                            if (/*compUser.hasVoicemailEndpoint(username, vmid)*/ true !== true) {
                                logger.warn(IDLOG, 'user "' + username + '" tried to delete voice message with db id "' + req.params.id + '" of the voicemail "' + vmid + '" not owned by him');
                                compUtil.net.sendHttp403(IDLOG, res);
                                return;
                            }

                            // delete the voice message
                            compVoicemail.deleteVoiceMessage(req.params.id, function (err2, results) {
                                try {

                                    if (err2) {
                                        logger.error(IDLOG, 'deleting voice message with id "' + req.params.id + '" of the voicemail "' + vmid + '" by the user "' + username + '"');
                                        compUtil.net.sendHttp500(IDLOG, res, err2.toString());
                                        return;
                                    }

                                    logger.info(IDLOG, 'voice message with id "' + req.params.id + '" of the voicemail "' + vmid + '" has been deleted successfully by the user "' + username + '"');
                                    res.send(200);

                                } catch (err3) {
                                    logger.error(IDLOG, err3.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err3.toString());
                                }
                            });

                        } catch (error) {
                            logger.error(IDLOG, error.stack);
                            compUtil.net.sendHttp500(IDLOG, res, error.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = voicemail.api;
        exports.list                 = voicemail.list;
        exports.listen               = voicemail.listen;
        exports.delete               = voicemail.delete;
        exports.download             = voicemail.download;
        exports.setLogger            = setLogger;
        exports.setCompUser          = setCompUser;
        exports.setCompUtil          = setCompUtil;
        exports.new_counters         = voicemail.new_counters;
        exports.setCompVoicemail     = setCompVoicemail;
        exports.setCompStaticHttp    = setCompStaticHttp;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
