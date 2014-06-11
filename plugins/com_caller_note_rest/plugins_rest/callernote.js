/**
* Provides caller note functions through REST API.
*
* @module com_caller_note_rest
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
* @default [plugins_rest/callernote]
*/
var IDLOG = '[plugins_rest/callernote]';

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
* The caller note architect component used for caller note functions.
*
* @property compCallerNote
* @type object
* @private
*/
var compCallerNote;

/**
* The utility architect component.
*
* @property compUtil
* @type object
* @private
*/
var compUtil;

/**
* The architect component to be used for authorization.
*
* @property compAuthorization
* @type object
* @private
*/
var compAuthorization;

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
* Set caller note architect component used by caller note functions.
*
* @method setCompCallerNote
* @param {object} cn The caller note architect component.
*/
function setCompCallerNote(cn) {
    try {
        compCallerNote = cn;
        logger.info(IDLOG, 'set caller note architect component');
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
* Sets the authorization architect component.
*
* @method setCompAuthorization
* @param {object} comp The authorization architect component.
*/
function setCompAuthorization(comp) {
    try {
        compAuthorization = comp;
        logger.info(IDLOG, 'set authorization architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Returns the caller notes filtered by user authorizations. Returned caller
* notes are those all of the user and the publics of the others. Phonebook contacts returned
* is the one created by the user in the cti phonebook, or one from the centralized phonebook
* or a public contact created by other users in the cti address book.
*
* @method getFilteredCallerNotes
* @param  {string} username       The username
* @param  {object} callerIdentity The identity of the caller to br filtered
* @return {array}  The filtered caller notes.
* @private
*/
function getFilteredCallerNotes(username, callerNotes) {
    try {
        // check parameters
        if ( typeof username !== 'string' || !(callerNotes instanceof Array) ) {
            throw new Error('wrong parameters');
        }

        var i;
        // filter the caller notes
        var filteredCallerNotes = [];

        // the user can view all the caller notes of all users, both private and public
        if (compAuthorization.authorizeAdminPostitUser(username) === true) {

            return callerNotes;
        }

        // the user can view only his caller notes and the public of the others
        else if (compAuthorization.authorizePostitUser(username) === true) {

            for (i = 0; i < callerNotes.length; i++) {

                if (callerNotes[i].creator === username || callerNotes[i].public  === 1) {

                    filteredCallerNotes.push(callerNotes[i]);
                }
            }
        }
        return filteredCallerNotes;

    } catch (err) {
        logger.error(IDLOG, err.stack);
        return [];
    }
}

(function() {
    try {
        /**
        * REST plugin that provides caller note functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`callernote/get_allbynum/:num`](#get_allbynumget)
        *
        * ---
        *
        * ### <a id="get_allbynumget">**`callernote/get_allbynum/:num`**</a>
        *
        * Gets all the created caller notes by the user and the publics by the others for the specified phone number.
        *
        * Example JSON response:
        *
        *     [
         {
            "creationdate": "11/06/2014"
            "creationtime": "14:26:12"
            "expirationdate": "12/06/2014"
            "expirationtime": "10:30:00"
            "id": 5
            "public": 1
            "reservation": 0
            "number": "609"
            "creator": "alessandro"
            "text": "test"
         }
     ]
        *
        * # POST requests
        *
        * 1. [`callernote/create`](#createpost)
        * 1. [`callernote/modify`](#modifypost)
        * 1. [`callernote/delete`](#deletepost)
        *
        * ---
        *
        * ### <a id="createpost">**`callernote/create`**</a>
        *
        * The client cretes a new caller note. The request must contains the following parameters:
        *
        * * `text: the message`
        * * `number: the phone number to associate the note`
        * * `visibility: ("public" | "private") If it's private only the user can view it, otherwise all other users can do it`
        * * `expirationDate: the expiration date of the note. Together with expirationTime, after that the note remains stored but isn't more showed up.
        *                    It must be espressed in the format YYYYMMDD. e.g. to express the date of "12 june 2013" you must use "20130612"`
        * * `expirationTime: the expiration time of the note. It must be espressed in the format HHmmss. e.g. to express the time of "21:00:45" you must use "210045"`
        * * `reservation: (true | false) if the user want to booking the next call from the specified number`
        *
        * Example JSON request parameters:
        *
        *     { "text": "some text", "number": "123456", "visibility": "public", "expirationDate": "20131001", "expirationTime": "210045", "reservation": "true" }
        *
        * ---
        *
        * ### <a id="modifypost">**`callernote/modify`**</a>
        *
        * The client modify his caller note. The request must contains the following parameters:
        *
        * * `id:               the caller note identifier in the NethCTI caller note database`
        * * `[text]:           the message`
        * * `[number]:         the phone number to associate the note`
        * * `[visibility]:     ("public" | "private") If it's private only the user can view it, otherwise all other users can do it`
        * * `[expirationDate]: the expiration date of the note. Together with expirationTime, after that the note remains stored but isn't more showed up.
        *                      It must be espressed in the format YYYYMMDD. e.g. to express the date of "12 june 2013" you must use "20130612". It requires the expirationTime`
        * * `[expirationTime]: the expiration time of the note. It must be espressed in the format HHmmss. e.g. to express the time of "21:00:45" you must use "210045".
        *                      It requires the expirationDate`
        * * `[reservation]:    (true | false) if the user want to booking the next call from the specified number`
        *
        * Example JSON request parameters:
        *
        *     { "id": "71", "text": "some text" }
        *
        * ---
        *
        * ### <a id="deletepost">**`callernote/delete`**</a>
        *
        * The client delete his caller note. The request must contains the following parameters:
        *
        * * `id: the caller note identifier in the NethCTI caller note database`
        *
        * Example JSON request parameters:
        *
        *     { "id": "71" }
        *
        * @class plugin_rest_callernote
        * @static
        */
        var callernote = {

            // the REST api
            api: {
                'root': 'callernote',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} get_allbynum/:num To gets all the created caller notes for the specified phone number
                */
                'get': [ 'get_allbynum/:num' ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} create To create a new caller note
                *   @param {string} modify To modify a caller note of the user
                *   @param {string} delete To delete a caller note of the user
                */
                'post' : [
                    'create',
                    'modify',
                    'delete'
                ],
                'head':  [],
                'del' :  []
            },

            /**
            * Gets all the created caller notes by the user and the publics by the others
            * for the specified phone number, using the following REST API:
            *
            *     get_allbynum
            *
            * @method create
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            get_allbynum: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var num      = req.params.num;

                    // check if the user has the "admin_postit" authorization
                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {

                        logger.log(IDLOG, 'requesting all caller notes by number ' + num + ': authorization "admin postit" successful for user "' + username + '"');

                    }

                    // check if the user has the "postit" authorization
                    else if (compAuthorization.authorizePostitUser(username) !== true) {

                        logger.warn(IDLOG, 'requesting all caller notes by number ' + num + ': authorization "postit" failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;

                    } else {
                        logger.log(IDLOG, 'requesting all caller notes by number ' + num + ': authorization "postit" successful for user "' + username + '"');
                    }

                    compCallerNote.getAllValidCallerNotesByNum(num, function (err, results) {
                        try {
                            if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }

                            else {
                                var filteredCallerNotes = getFilteredCallerNotes(username, results);

                                logger.info(IDLOG, 'send ' + filteredCallerNotes.length + ' filtered caller notes of number ' + num + ' to user "' + username + '"');
                                res.send(200, filteredCallerNotes);
                            }
                        } catch (err) {
                            logger.error(IDLOG, err.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Create a new caller note by the following REST API:
            *
            *     create
            *
            * @method create
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            create: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check the administration caller note authorization
                    if (compAuthorization.authorizeAdminCallerNoteUser(username) === true) {
                        logger.info(IDLOG, 'creating caller note: admin caller note authorization successful for user "' + username + '"');

                    }
                    // check the caller note authorization
                    else if (compAuthorization.authorizeCallerNoteUser(username) !== true) {
                        logger.warn(IDLOG, 'creating caller note: caller note authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    logger.info(IDLOG, 'caller note authorization successfully for user "' + username + '"');

                    var data     = req.params;
                    data.creator = username;

                    compCallerNote.newCallerNote(data, function (err) {
                        try {
                            if (err) { compUtil.net.sendHttp500(IDLOG, res, err.toString()); }

                            else {
                                logger.info(IDLOG, 'new caller note by "' + username + '" for number "' + data.number + '" has been successfully created');
                                compUtil.net.sendHttp201(IDLOG, res);
                            }

                        } catch (err1) {
                            logger.error(IDLOG, err1.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                        }
                    });
                } catch (error) {
                    logger.error(IDLOG, error.stack);
                    compUtil.net.sendHttp500(IDLOG, res, error.toString());
                }
            },

            /**
            * Modify a caller note of the user by the following REST API:
            *
            *     modify
            *
            * @method modify
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            modify: function (req, res, next) {
                try {
                    var data = req.params;

                    if (typeof data !== 'object' || typeof data.id !== 'string') {
                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // check the administration caller note authorization
                    if (compAuthorization.authorizeAdminCallerNoteUser(username) === true) {
                        logger.info(IDLOG, 'modifying caller note: admin caller note authorization successful for user "' + username + '"');

                    }
                    // check the caller note authorization
                    else if (compAuthorization.authorizeCallerNoteUser(username) !== true) {
                        logger.warn(IDLOG, 'modifying caller note: caller note authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    logger.info(IDLOG, 'caller note authorization successfully for user "' + username + '"');

                    compCallerNote.getCallerNote(data.id, function (err1, result) {
                        try {
                            if (err1) { throw err1; }

                            // check the authorization for the user. He's authorized to modify only his
                            // caller note. If no caller note has been found the "result" property is an empty object
                            if (   Object.keys(result).length === 0 // the object is empty: no caller note has been found
                                || result.creator !== username) {   // the caller note isn't owned by the user

                                logger.warn(IDLOG, 'modify caller note with db id "' + data.id + '" by the user "' + username + '": the caller note is not owned by the user or it isn\'t present');
                                compUtil.net.sendHttp403(IDLOG, res);
                                return;
                            }

                            compCallerNote.modifyCallerNote(data, function (err3, results) {
                                try {
                                    if (err3) { throw err3; }

                                    else {
                                        logger.info(IDLOG, 'caller note with db id "' + data.id + '" has been successfully modified by the user "' + username + '"');
                                        compUtil.net.sendHttp200(IDLOG, res);
                                    }

                                } catch (err4) {
                                    logger.error(IDLOG, err4.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err4.toString());
                                }
                            });

                        } catch (err2) {
                            logger.error(IDLOG, err2.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err2.toString());
                        }
                    });

                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Delete a caller note by the following REST API:
            *
            *     delete
            *
            * @method delete
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            delete: function (req, res, next) {
                try {
                    var id = req.params.id;

                    if (typeof id !== 'string') {
                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    // extract the username added in the authentication step
                    var username = req.headers.authorization_user;

                    // check the administration caller note authorization
                    if (compAuthorization.authorizeAdminCallerNoteUser(username) === true) {
                        logger.info(IDLOG, 'deleting caller note history interval: admin caller note authorization successful for user "' + username + '"');

                    }
                    // check the caller note authorization
                    else if (compAuthorization.authorizeCallerNoteUser(username) !== true) {
                        logger.warn(IDLOG, 'deleting caller note history interval: caller note authorization failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    logger.info(IDLOG, 'caller note authorization successfully for user "' + username + '"');

                    compCallerNote.getCallerNote(id, function (err1, result) {
                        try {
                            if (err1) { throw err1; }

                            // check the authorization for the user. He's authorized to delete only his
                            // caller note. If no caller note has been found the "result" property is an empty object
                            if (   Object.keys(result).length === 0 // the object is empty: no caller note has been found
                                || result.creator !== username) {   // the caller note isn't owned by the user

                                logger.warn(IDLOG, 'deleting caller note with db id "' + id + '" by the user "' + username + '": the caller note is not owned by the user or it isn\'t present');
                                compUtil.net.sendHttp403(IDLOG, res);
                                return;
                            }

                            compCallerNote.deleteCallerNote(id, function (err3, results) {
                                try {
                                    if (err3) { throw err3; }

                                    else {
                                        logger.info(IDLOG, 'caller note with db id "' + id + '" has been successfully deleted by the user "' + username + '"');
                                        compUtil.net.sendHttp200(IDLOG, res);
                                    }

                                } catch (err4) {
                                    logger.error(IDLOG, err4.stack);
                                    compUtil.net.sendHttp500(IDLOG, res, err4.toString());
                                }
                            });

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
        }
        exports.api                  = callernote.api;
        exports.create               = callernote.create;
        exports.modify               = callernote.modify;
        exports.delete               = callernote.delete;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.get_allbynum         = callernote.get_allbynum;
        exports.setCompCallerNote    = setCompCallerNote;
        exports.setCompAuthorization = setCompAuthorization;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();
