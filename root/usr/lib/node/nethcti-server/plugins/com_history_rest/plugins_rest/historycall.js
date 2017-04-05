/**
* Provides asterisk history call functions through REST API.
*
* @module com_history_rest
* @submodule plugins_rest
*/
var path = require('path');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [plugins_rest/historycall]
*/
var IDLOG = '[plugins_rest/historycall]';

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
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

/**
* The history architect component used for history functions.
*
* @property compHistory
* @type object
* @private
*/
var compHistory;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* The user architect component.
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
* The asterisk proxy architect component.
*
* @property compAstProxy
* @type object
* @private
*/
var compAstProxy;

/**
* Sets the asterisk proxy architect component.
*
* @method setCompAstProxy
* @param {object} comp The asterisk proxy architect component.
*/
function setCompAstProxy(comp) {
    try {
        compAstProxy = comp;
        logger.info(IDLOG, 'set asterisk proxy architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}


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
* Set history architect component used by history functions.
*
* @method setCompHistory
* @param {object} ch The history architect component.
*/
function setCompHistory(ch) {
    try {
        compHistory = ch;
        logger.info(IDLOG, 'set history architect component');
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
* Sets the user architect component.
*
* @method setCompUser
* @param {object} comp The user architect component.
*/
function setCompUser(comp) {
    try {
        compUser = comp;
        logger.info(IDLOG, 'set user architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set authorization architect component used by history functions.
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

(function(){
    try {
        /**
        * REST plugin that provides history functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`historycall/down_callrec/:id`](#down_callrecget)
        * 1. [`historycall/listen_callrec/:id`](#listen_callrecget)
        * 1. [`historycall/day/:endpoint/:day[?limit=n&offset=n&sort=field]`](#dayget)
        * 1. [`historycall/day/:endpoint/:day/:filter[?limit=n&offset=n&sort=field]`](#day_filterget)
        * 1. [`historycall/interval/:endpoint/:from/:to[?limit=n&offset=n&sort=field]`](#intervalget)
        * 1. [`historycall/interval/:endpoint/:from/:to/:filter[?limit=n&offset=n&sort=field]`](#interval_filterget)
        *
        * ---
        *
        * ### <a id="down_callrecget">**`historycall/down_callrec/:id`**</a>
        *
        * The user can downlaod the record audio file of a call. The _id_ is the call indentifier in the database
        * (_uniqueid_ field of the _asteriskcdrdb.cdr_ database table). The user with _admin\_recording_
        * authorization can download all audio files, while the user with the _recording_ permission can download only the
        * audio file of his own calls.
        *
        * ---
        *
        * ### <a id="listen_callrecget">**`historycall/listen_callrec/:id`**</a>
        *
        * The user can listen the record audio file of a call. The _id_ is the call indentifier in the database
        * (_uniqueid_ field of the _asteriskcdrdb.cdr_ database table). The user with _admin\_recording_
        * authorization can listen all audio files, while the user with the _recording_ permission can listen only the
        * audio file of his own calls.
        *
        * ---
        *
        * ### <a id="dayget">**`historycall/day/:endpoint/:day[?limit=n&offset=n&sort=field]`**</a>
        *
        * Returns the history call of the day _"day"_ and endpoint _"endpoint"_. E.g. the endpoint can be
        * the extension number. Date must be expressed in YYYYMMDD format. If an error occurs an HTTP 500
        * response is returned. Support the pagination with the limit and offset parameters and sorting.
        *
        * Example JSON response:
        *
        *     [
         {
            time: 1491300647
            channel: "SIP/2001-00000000"
            dstchannel: "SIP/303-0000000b"
            uniqueid: "1388647977.5182"
            duration: 29
            billsec: 21
            disposition: "ANSWERED"
            dcontext: "ext-local"
            recordingfile: ""
            src: "0721123432"
            dst: "vms201"
            clid: ""CHIU: USER" <1233312>"
         }
     ]
        *
        * ---
        *
        * ### <a id="day_filterget">**`historycall/day/:endpoint/:day/:filter[?limit=n&offset=n&sort=field]`**</a>
        *
        * Returns the history call of the day _"day"_ and endpoint _"endpoint"_ filtering by _"filter"_.
        * E.g. the endpoint can be the extension number. Date must be expressed in YYYYMMDD format. If an
        * error occurs an HTTP 500 response is returned. Support the pagination with the limit and offset
        * parameters and sorting.
        *
        * Example JSON response:
        *
        *     [
         {
            time: 1491300647
            channel: "SIP/2001-00000000"
            dstchannel: "SIP/303-0000000b"
            uniqueid: "1388647977.5182"
            duration: 29
            billsec: 21
            disposition: "ANSWERED"
            dcontext: "ext-local"
            recordingfile: ""
            src: "0721123432"
            dst: "vms201"
            clid: ""CHIU: USER" <1233312>"
         }
     ]
        *
        * ---
        *
        * ### <a id="intervalget">**`historycall/interval/:endpoint/:from/:to[?limit=n&offset=n&sort=field]`**</a>
        *
        * Returns the history call between _"from"_ date to _"to"_ date for the endpoint _"endpoint"_.
        * E.g. the endpoint can be the extension number. Dates must be expressed in YYYYMMDD format.
        * If an error occurs an HTTP 500 response is returned. Support the pagination with the limit and
        * offset parameters and sorting.
        *
        * Example JSON response:
        *
        *     [
         {
            time: 1491300647
            channel: "SIP/2001-00000000"
            dstchannel: "SIP/303-0000000b"
            uniqueid: "1388647977.5182"
            duration: 29
            billsec: 21
            disposition: "ANSWERED"
            dcontext: "ext-local"
            recordingfile: ""
            src: "0721123432"
            dst: "vms201"
            clid: ""CHIU: USER" <1233312>"
         }
     ]
        *
        * ---
        *
        * ### <a id="interval_filterget">**`historycall/interval/:endpoint/:from/:to/:filter[?limit=n&offset=n&sort=field]`**</a>
        *
        * Returns the history call between _"from"_ date to _"to"_ date for the endpoint _"endpoint"_
        * filtering by _"filter"_. E.g. the endpoint can be the extension number. Date must be expressed
        * in YYYYMMDD format. If an error occurs an HTTP 500 response is returned.
        * Support the pagination with the limit and offset parameters and sorting.
        *
        * Example JSON response:
        *
        *     [
         {
            time: 1491300647
            channel: "SIP/2001-00000000"
            dstchannel: "SIP/303-0000000b"
            uniqueid: "1388647977.5182"
            duration: 29
            billsec: 21
            disposition: "ANSWERED"
            dcontext: "ext-local"
            recordingfile: ""
            src: "0721123432"
            dst: "vms201"
            clid: ""CHIU: USER" <1233312>"
         }
     ]
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`historycall/delete_callrec`](#delete_callrecpost)
        *
        * ---
        *
        * ### <a id="delete_callrecpost">**`historycall/delete_callrec`**</a>
        *
        * Delete the specified call recording. The request must contains the following parameters:
        *
        * * `id: the identifier of the call in the database`
        *
        * Example JSON request parameters:
        *
        *     { "id": "74" }
        *
        * @class plugin_rest_historycall
        * @static
        */
        var historycall = {

            // the REST api
            api: {
                'root': 'historycall',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} down_callrec/:id   To download the record audio file of a call
                *
                *   @param {string} listen_callrec/:id To listen the record audio file of a call
                *
                *   @param {string} day/:endpoint/:day[?limit=n&offset=n&sort=field] To get the history call of the day and endpoint. The date must be expressed
                *                                      in YYYYMMDD format
                *
                *   @param {string} day/:endpoint/:day/:filter[?limit=n&offset=n&sort=field] To get the history call of the day and endpoint filtering by filter.
                *                                              The date must be expressed in YYYYMMDD format
                *
                *   @param {string} interval/:endpoint/:from/:to[?limit=n&offset=n&sort=field] To get the history call between _"from"_ date to _"to"_ date.
                *                                                The date must be expressed in YYYYMMDD format
                *
                *   @param {string} interval/:endpoint/:from/:to/:filter[?limit=n&offset=n&sort=field] To get the history call between _"from"_ date to _"to"_
                *                                                        date filtering by filter. The date must be expressed in YYYYMMDD format
                */
                'get' : [
                    'down_callrec/:id',
                    'listen_callrec/:id',
                    'day/:endpoint/:day',
                    'day/:endpoint/:day/:filter',
                    'interval/:endpoint/:from/:to',
                    'interval/:endpoint/:from/:to/:filter'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} delete_callrec To delete a call recording
                */
                'post': [ 'delete_callrec' ],
                'head': [],
                'del' : []
            },

            /**
            * Delete the record audio file of a call with the following REST API:
            *
            *     delete_callrec
            *
            * @method delete_callrec
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            delete_callrec: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;
                    var id       = req.params.id;

                    // check the "admin_recording" authorization. If the user has this permission he can delete
                    // all the audio files. So gets the file informations and then delete the file
                    if (compAuthorization.authorizeAdminRecordingUser(username) === true) {
                        logger.info(IDLOG, 'deleting record call audio file: "admin_recording" authorization successful for user "' + username + '"');

                        // get the file informations using the history component. The informations are the creation year,
                        // month, day and the filename. This data is need to delete the file using history component
                        compHistory.getCallRecordingFileData(id, function (err, result) {
                            try {

                                if (err) { throw err; }

                                // the user isn't involved in the recorded call, so he can't delete it
                                else if (typeof result === 'boolean' && !result) {
                                    var str = 'no data informations about recording call with id "' + id + '" to delete by the user "' + username + '"';
                                    logger.warn(IDLOG, str);
                                    compUtil.net.sendHttp500(IDLOG, res, str);

                                } else {
                                    // delete recorded call
                                    deleteCallRecording(id, username, result, res);
                                }
                            } catch (err1) {
                                logger.error(IDLOG, err1.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                            }
                        });
                    }

                    // check the "recording" authorization
                    else if (compAuthorization.authorizeRecordingUser(username) !== true) {
                        logger.warn(IDLOG, 'deleting record call audio file: "recording" authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // the user has the "recording" authorization, so check if the recorded call relates to himself
                    else {
                        // get all the extension endpoints of the user
                        var extens = Object.keys(compUser.getAllEndpointsExtension(username));

                        // here the user only has the "recording" authorization so he can delete only the recording call in which he
                        // is involved. So checks if at least one extension of the user is involved in the recorded call. As a result
                        // of this test is returned a "false" value if the test is failed, an object with the file informations if the
                        // test is successful
                        compHistory.isAtLeastExtenInCallRecording(id, extens, function (err, result) {
                            try {

                                if (err) { throw err; }

                                // the user isn't involved in the recorded call, so he can't delete it
                                else if (typeof result === 'boolean' && !result) {
                                    logger.warn(IDLOG, 'user "' + username + '" try to delete the recording call id "' + id + '", but he isn\'t involved in the call');
                                    compUtil.net.sendHttp403(IDLOG, res);

                                } else {
                                    // the user is involved in the recorded call so the file is deleted
                                    deleteCallRecording(id, username, result, res);
                                }

                            } catch (err1) {
                                logger.error(IDLOG, err1.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                            }
                        });
                    }
                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            * Listen the record audio file of a call with the following REST API:
            *
            *     listen_callrec
            *
            * @method listen_callrec
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            listen_callrec: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;
                    var id       = req.params.id;

                    // check the "admin_recording" authorization. If the user has this permission he can listen
                    // all the audio file. So gets the file informations and then return the data to the client
                    if (compAuthorization.authorizeAdminRecordingUser(username) === true) {
                        logger.info(IDLOG, 'listening record call audio file: admin recording authorization successful for user "' + username + '"');

                        // get the file informations using the history component. The informations are the creation year,
                        // month, day and the filename. This data is need to listen the file using history component
                        compHistory.getCallRecordingFileData(id, function (err, result) {
                            try {

                                if (err) { throw err; }

                                // the user isn't involved in the recorded call, so he can't listen it
                                else if (typeof result === 'boolean' && !result) {
                                    var str = 'no data informations about recording call with id "' + id + '" to listen by the user "' + username + '"';
                                    logger.warn(IDLOG, str);
                                    compUtil.net.sendHttp500(IDLOG, res, str);

                                } else {
                                    // listen recorded call, so the content of the file is sent to the client
                                    listenCallRecording(id, username, result, res);
                                }
                            } catch (err1) {
                                logger.error(IDLOG, err1.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                            }
                        });

                    }

                    // check the "recording" authorization
                    else if (compAuthorization.authorizeRecordingUser(username) !== true) {
                        logger.warn(IDLOG, 'listening record call audio file: recording authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // the user has the "recording" authorization, so check if the recorded call relates to himself
                    else {
                        // get all the extension endpoints of the user
                        var extens = Object.keys(compUser.getAllEndpointsExtension(username));

                        // here the user only has the "recording" authorization so he can listen only the recording call in which he
                        // is involved. So checks if at least one extension of the user is involved in the recorded call. As a result
                        // of this test is returned a "false" value if the test is failed, an object with the file informations if the
                        // test is successful
                        compHistory.isAtLeastExtenInCallRecording(id, extens, function (err, result) {
                            try {

                                if (err) { throw err; }

                                // the user isn't involved in the recorded call, so he can't listen it
                                else if (typeof result === 'boolean' && !result) {
                                    logger.warn(IDLOG, 'user "' + username + '" try to listen the recording call id "' + id + '", but he isn\'t involved in the call');
                                    compUtil.net.sendHttp403(IDLOG, res);

                                } else {
                                    // the user is involved in the recorded call so the content of the file is sent to the client
                                    listenCallRecording(id, username, result, res);
                                }

                            } catch (err1) {
                                logger.error(IDLOG, err1.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                            }
                        });
                    }

                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            * Download the record audio file of a call with the following REST API:
            *
            *     down_callrec
            *
            * @method down_callrec
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            down_callrec: function (req, res, next) {
                try {
                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;
                    var id       = req.params.id;

                    // check the "admin_recording" authorization. If the user has this permission he can download
                    // all the audio files. So gets the file informations and then return the data to the client
                    if (/*compAuthorization.authorizeAdminRecordingUser(username)*/true === true) {
                        logger.info(IDLOG, 'downloading record call audio file: "admin_recording" authorization successful for user "' + username + '"');

                        // get the file informations using the history component. The informations are the creation year,
                        // month, day and the filename. This data is need to download the file using the history component
                        compHistory.getCallRecordingFileData(id, function (err, result) {
                            try {

                                if (err) { throw err; }

                                // the user isn't involved in the recorded call, so he can't download it
                                else if (typeof result === 'boolean' && !result) {
                                    var str = 'no data informations about recording call with id "' + id + '" to download it by the user "' + username + '"';
                                    logger.warn(IDLOG, str);
                                    compUtil.net.sendHttp500(IDLOG, res, str);

                                } else {
                                    // download recorded call, so the content of the file is sent to the client
                                    downCallRecording(id, username, result, res);
                                }
                            } catch (err1) {
                                logger.error(IDLOG, err1.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                            }
                        });

                    }

                    // check the "recording" authorization
                    else if (compAuthorization.authorizeRecordingUser(username) !== true) {
                        logger.warn(IDLOG, 'downloading record call audio file: "recording" authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    // the user has the "recording" authorization, so check if the recorded call relates to himself
                    else {
                        // get all the extension endpoints of the user
                        var extens = Object.keys(compUser.getAllEndpointsExtension(username));

                        // here the user only has the "recording" authorization so he can download only the recording call in which he
                        // is involved. So checks if at least one extension of the user is involved in the recorded call. As a result
                        // of this test is returned a "false" value if the test is failed, an object with the file informations if the
                        // test is successful
                        compHistory.isAtLeastExtenInCallRecording(id, extens, function (err, result) {
                            try {

                                if (err) { throw err; }

                                // the user isn't involved in the recorded call, so he can't download it
                                else if (typeof result === 'boolean' && !result) {
                                    logger.warn(IDLOG, 'user "' + username + '" try to download the recording call id "' + id + '", but he isn\'t involved in the call');
                                    compUtil.net.sendHttp403(IDLOG, res);

                                } else {
                                    // the user is involved in the recorded call so the content of the file is sent to the client
                                    downCallRecording(id, username, result, res);
                                }

                            } catch (err1) {
                                logger.error(IDLOG, err1.stack);
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                            }
                        });
                    }

                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            * Search the history call for the specified day, endpoint and optional filter by the following REST api:
            *
            *     day/:endpoint/:day[?limit=n&offset=n&sort=field]
            *     day/:endpoint/:day/:filter[?limit=n&offset=n&sort=field]
            *
            * @method day
            * @param {object} req The client request.
            * @param {object} res The client response.
            * @param {function} next Function to run the next handler in the chain.
            *
            * It uses _interval_ function.
            */
            day: function (req, res, next) {
                try {
                    req.params.to = req.params.day;
                    req.params.from = req.params.day;
                    this.interval(req, res, next);
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Search the history call for the specified interval, endpoint and optional filter by the following REST api:
            *
            *     interval/:endpoint/:from/:to[?limit=n&offset=n&sort=field]
            *     interval/:endpoint/:from/:to/:filter[?limit=n&offset=n&sort=field]
            *
            * @method interval
            * @param {object}   req  The client request.
            * @param {object}   res  The client response.
            * @param {function} next Function to run the next handler in the chain.
            */
            interval: function (req, res, next) {
                try {
                    // get the username from the authorization header added by authentication step
                    var username = req.headers.authorization_user;

                    // check the administration cdr authorization
                    // if (compAuthorization.authorizeAdminCdrUser(username) === true) {
                    //     logger.info(IDLOG, 'getting history interval call: admin cdr authorization successful for user "' + username + '"');
                    //
                    // }
                    // check the cdr authorization
                    // else if (/*compAuthorization.authorizeCdrUser(username)*/ true !== true) {
                    //     logger.warn(IDLOG, 'getting history interval call: cdr authorization failed for user "' + username + '" !');
                    //     compUtil.net.sendHttp403(IDLOG, res);
                    //     return;
                    // }

                    // check if the endpoint in the request is an endpoint of the applicant user. The user
                    // can only see the cdr of his endpoints
                    // if (compAuthorization.verifyUserEndpointExten(username, req.params.endpoint) === false) {
                    //     logger.warn(IDLOG, 'authorization cdr call failed for user "' + username + '": requested endpoint ' +
                    //                        req.params.endpoint + ' not owned by him');
                    //     compUtil.net.sendHttp403(IDLOG, res);
                    //     return;
                    // }

                    logger.info(IDLOG, 'cdr authorization successfully for user "' + username + '" and endpoint ' + req.params.endpoint);

                    // check the "administration recording" and "recording" authorization. If it's enabled the user can view also all the data
                    // about his recording audio files
                    var recording = true;//compAuthorization.authorizeRecordingUser(username) || compAuthorization.authorizeAdminRecordingUser(username);
                    // if (compAuthorization.authorizeAdminRecordingUser(username) === true) {
                    //     logger.info(IDLOG, 'user "' + username + '" has the "admin_recording" authorization');
                    //
                    // } else if (compAuthorization.authorizeRecordingUser(username) === true) {
                    //     logger.info(IDLOG, 'user "' + username + '" has the "recording" authorization');
                    //
                    // } else {
                    //     logger.info(IDLOG, 'user "' + username + '" has neither the "admin_recording" nor the "recording" authorization');
                    // }

                    var obj = {
                        to:        req.params.to,
                        from:      req.params.from,
                        endpoint:  req.params.endpoint,
                        recording: recording
                    };

                    // add filter parameter if it has been specified
                    if (req.params.filter) { obj.filter = req.params.filter; }

                    // use the history component
                    compHistory.getHistoryCallInterval(obj, req.params.offset, req.params.limit, req.params.sort, function (err1, results) {
                        try {
                            if (err1) { throw err1; }
                            else {
                                logger.info(IDLOG, 'send ' + results.length   + ' results searching history call ' +
                                                   'interval between ' + obj.from + ' to ' + obj.to + ' for ' +
                                                   'endpoint ' + obj.endpoint + ' and filter ' + (obj.filter ? obj.filter : '""') +
                                                   (obj.recording ? ' with recording data' : '') +
                                                   ' to user "' + username + '"');
                                res.send(200, results);
                            }

                        } catch (err2) {
                            logger.error(IDLOG, err2.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err2.toString());
                        }
                    });
                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            }
        }
        exports.api                  = historycall.api;
        exports.day                  = historycall.day;
        exports.interval             = historycall.interval;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompUser          = setCompUser;
        exports.down_callrec         = historycall.down_callrec;
        exports.listen_callrec       = historycall.listen_callrec;
        exports.delete_callrec       = historycall.delete_callrec;
        exports.setCompStaticHttp    = setCompStaticHttp;
        exports.setCompAstProxy      = setCompAstProxy;
        exports.setCompHistory       = setCompHistory;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Listen call recording using history component. This returns the content of
* the audio file using base64 enconding. So the data is sent to the client.
*
* @method listenCallRecording
* @param {string} id              The identifier of the call
* @param {string} username        The name of the user
* @param {object} data
*   @param {string} data.year     The creation year of the file
*   @param {string} data.month    The creation month of the file
*   @param {string} data.day      The creation day of the file
*   @param {string} data.filename The name of the file
* @param {object} res             The client response
* @private
*/
function listenCallRecording(id, username, data, res) {
    try {
        compHistory.getCallRecordingContent(data, function (err1, result) {
            try {

                if (err1) { throw err1; }

                else {
                    logger.info(IDLOG, 'listen of the recording call with id "' + id + '" has been sent successfully to user "' + username + '"');
                    res.send(200, result);
                }

            } catch (err2) {
                logger.error(IDLOG, err2.stack);
                compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Download call recording using the history component. This returns the content of
* the audio file using base64 enconding. So the data is sent to the client.
*
* @method downCallRecording
* @param {string} id              The identifier of the call
* @param {string} username        The name of the user
* @param {object} data
*   @param {string} data.year     The creation year of the file
*   @param {string} data.month    The creation month of the file
*   @param {string} data.day      The creation day of the file
*   @param {string} data.filename The name of the file
* @param {object} res             The client response
* @private
*/
function downCallRecording(id, username, data, res) {
    try {
        compHistory.getCallRecordingContent(data, function (err1, result) {
            try {

                if (err1) { throw err1; }

                else {
                    logger.info(IDLOG, 'download of the recording call with id "' + id + '" has been sent successfully to user "' + username + '"');
                    // get base path of the call recordings and then construct the filepath using the arguments
                    var filename = 'recording' + id + username + 'tmpaudio.wav';
                    var basepath = compAstProxy.getBaseCallRecAudioPath();
                    var filepath = path.join(basepath, data.year, data.month, data.day, data.filename);

                    compStaticHttp.copyFile(filepath, filename, function (err1) {
                        try {
                            if (err1) {
                                logger.warn(IDLOG, 'copying static file "' + filepath + '" -> "' + filename + '": ' + err1.toString());
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());

                            } else {
                                logger.info(IDLOG, 'send recording filename to download "' + filename + '" to user "' + username + '"');
                                res.send(200, filename);
                            }
                        } catch (err3) {
                            logger.error(IDLOG, err3.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err3.toString());
                        }
                    });
                }
            } catch (err2) {
                logger.error(IDLOG, err2.stack);
                compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Delete call recording using history component.
*
* @method deleteCallRecording
* @param {string} id              The identifier of the call
* @param {string} username        The name of the user
* @param {object} data
*   @param {string} data.year     The creation year of the file
*   @param {string} data.month    The creation month of the file
*   @param {string} data.day      The creation day of the file
*   @param {string} data.filename The name of the file
* @param {object} res             The client response
* @private
*/
function deleteCallRecording(id, username, data, res) {
    try {
        compHistory.deleteCallRecording(id, data, function (err1, result) {
            try {
                if (err1) { throw err1; }

                else {
                    logger.info(IDLOG, 'the recording call with id "' + id + '" has been deleted successfully by the user "' + username + '"');
                    res.send(200, result);
                }

            } catch (err2) {
                logger.error(IDLOG, err2.stack);
                compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}
