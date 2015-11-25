/**
* Provides postit functions through REST API.
*
* @module com_postit_rest
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
* @default [plugins_rest/postit]
*/
var IDLOG = '[plugins_rest/postit]';

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
* The postit architect component used for postit functions.
*
* @property compPostit
* @type object
* @private
*/
var compPostit;

/**
* The remote sites communication architect component.
*
* @property compComNethctiRemotes
* @type object
* @private
*/
var compComNethctiRemotes;

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
* Set postit architect component used by postit functions.
*
* @method setCompPostit
* @param {object} cp The postit architect component.
*/
function setCompPostit(cp) {
    try {
        compPostit = cp;
        logger.info(IDLOG, 'set postit architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set remote sites communication architect component.
*
* @method setCompComNethctiRemotes
* @param {object} comp The remote sites communication architect component.
*/
function setCompComNethctiRemotes(comp) {
    try {
        compComNethctiRemotes = comp;
        logger.info(IDLOG, 'set remote sites communication architect component');
    } catch (err) {
       logger.error(IDLOG, err.stack);
    }
}

/**
* Set the authorization architect component.
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

(function(){
    try {
        /**
        * REST plugin that provides postit functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`postit/new`](#newget)
        * 1. [`postit/read/:id`](#readget)
        *
        * ---
        *
        * ### <a id="newget">**`postit/new`**</a>
        *
        * Gets all the new post-it messages of the user.
        *
        * Example JSON response:
        *
        *     {
         "recipient": "alessandro",
         "new": [
              {
                  "creationdate": "17/01/2014",
                  "creationtime": "08:59:31",
                  "readdate": null,
                  "timeread": null,
                  "id": 18,
                  "text": "3333333333",
                  "creator": "giovanni",
                  "recipient": "alessandro"
              },
              {
                  "creationdate": "17/01/2014",
                  "creationtime": "08:59:28",
                  "readdate": null,
                  "timeread": null,
                  "id": 17,
                  "text": "22222",
                  "creator": "giovanni",
                  "recipient": "alessandro"
              }
         ]
     }
        *
        * ---
        *
        * ### <a id="readget">**`postit/read/:id`**</a>
        *
        * Gets the specified post-it. This call update the read date status of the post-it.
        * The _id_ is the unique identifier of the message.
        *
        * Example JSON response:
        *
        *     {
         "id": 17,
         "text": "22222",
         "creator": "giovanni",
         "readdate": null,
         "recipient": "alessandro",
         "creation": "2014-01-17T08:59:28.000Z"
     }
        *
        * # POST requests
        *
        * 1. [`postit/create`](#createpost)
        * 1. [`postit/remote_create`](#remote_createpost)
        * 1. [`postit/modify`](#modifypost)
        * 1. [`postit/delete`](#deletepost)
        *
        * ---
        *
        * ### <a id="createpost">**`postit/create`**</a>
        *
        * The client crete a new post-it for the recipient.
        *
        * * `text: the text of the post-it`
        * * `recipient: the destination user of the message`
        * * `[creator]: the username of the creator. It is needed for requests coming from remote users of remote sites`
        *
        * Example JSON request parameters:
        *
        *     { "text": "message text", "recipient": "john" }
        *     { "text": "message text", "recipient": "john", "creator": "user" }
        *
        * ---
        *
        * ### <a id="remote_createpost">**`postit/remote_create`**</a>
        *
        * The client crete a new post-it for a recipient of a remote site. It is callable
        * only from a local clients.
        *
        * * `text: the text of the post-it`
        * * `recipient: the destination user of the message`
        * * `site: the name of the remote site`
        *
        * Example JSON request parameters:
        *
        *     { "text": "message text", "recipient": "john", "site": "ranocchi" }
        *
        * ---
        *
        * ### <a id="modifypost">**`postit/modify`**</a>
        *
        * The client changes his post-it.
        *
        * * `id: the database identifier of the post-it`
        * * `text: the text of the post-it`
        *
        * Example JSON request parameters:
        *
        *     { "id": "76", text": "modified text" }
        *
        * ---
        *
        * ### <a id="deletepost">**`postit/delete`**</a>
        *
        * Deletes the specified post-it.
        *
        * * `id: the unique identifier of the post-it`
        *
        * Example JSON request parameters:
        *
        *     { "id": "76" }
        *
        * @class plugin_rest_postit
        * @static
        */
        var postit = {

            // the REST api
            api: {
                'root': 'postit',

                /**
                * REST API to be requested using HTTP GET request.
                *
                * @property get
                * @type {array}
                *
                *   @param {string} new      To get all the new post-it messages
                *   @param {string} read/:id To get a specific post-it message
                */
                'get': [
                    'new',
                    'read/:id'
                ],

                /**
                * REST API to be requested using HTTP POST request.
                *
                * @property post
                * @type {array}
                *
                *   @param {string} create        To create a new post-it for a user
                *   @param {string} remote_create To create a new post-it for a user of a remote site
                *   @param {string} modify        To modify a post-it of a user
                *   @param {string} delete        To delete the post-it
                */
                'post' : [
                    'create',
                    'remote_create',
                    'modify',
                    'delete'
                ],
                'head':  [],
                'del' :  []
            },

            /**
            * Returns all the new post-it messages by the following REST API:
            *
            *     new
            *
            * @method new
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            new: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;

                    // check the postit & administration postit authorization
                    if (   compAuthorization.authorizePostitUser(username)      !== true
                        && compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, 'getting all new post-it of user "' + username + '": "postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {
                        logger.info(IDLOG, 'getting all new post-it of user "' + username + '": "admin_postit" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizePostitUser(username) === true) {
                        logger.info(IDLOG, 'getting all new post-it of user "' + username + '": "postit" authorization successfully for user "' + username + '"');
                    }

                    compPostit.getNewPostit(username, function (err1, username, results) {
                        try {
                            if (err1) {
                                logger.error(IDLOG, 'getting all new post-it of user "' + username + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err1.toString());

                            } else {

                                // check the user authorization
                                if (   compAuthorization.authorizeAdminPostitUser(username) === true
                                    || compAuthorization.authorizePostitUser(username)      === true) {

                                    logger.info(IDLOG, 'send all the new post-it of user "' + username + '" to himself');
                                    res.send(200, { recipient: username, new: results });
                                }
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
            },

            /**
            * Returns the specified post-it message by its unique identifier by the following REST API:
            *
            *     read
            *
            * @method read
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            read: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var id       = req.params.id;

                    // check the postit & administration postit authorization
                    if (   compAuthorization.authorizePostitUser(username)      !== true
                        && compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, 'reading postit with db id "' + id  + '": "postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {
                        logger.info(IDLOG, 'reading postit with db id "' + id  + '": "admin_postit" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizePostitUser(username) === true) {
                        logger.info(IDLOG, 'reading postit with db id "' + id  + '": "postit" authorization successfully for user "' + username + '"');
                    }

                    compPostit.readPostit(username, id, function (err, result) {
                        try {
                            if (err) {
                                logger.error(IDLOG, 'reading postit with db id "' + id + '" for user "' + username + '"');
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());

                            } else {

                                // check the user authorization. If the user has the "admin_postit" authorization he can read the postit.
                                // If the user has only the "postit" authorization he can read only his created postit and those that is
                                // assigned to him
                                if (compAuthorization.authorizeAdminPostitUser(username) === true) {

                                    logger.info(IDLOG, 'send postit with db id "' + id + '" to user "' + username + '"');
                                    res.send(200, result);

                                } else if (compAuthorization.authorizePostitUser(username) === true) {

                                    if (result.creator === username || result.recipient === username) {
                                        logger.info(IDLOG, 'send postit with db id "' + id + '" to user "' + username + '"');
                                        res.send(200, result);

                                    } else {
                                        logger.warn(IDLOG, 'reading postit with db id "' + id  + '": the user "' + username + '" has "postit" permission but the postit isn\'t for him');
                                        compUtil.net.sendHttp403(IDLOG, res);
                                    }
                                }
                            }

                        } catch (err1) {
                            logger.error(IDLOG, err1.stack);
                            compUtil.net.sendHttp500(IDLOG, res, err1.toString());
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Create a new post-it by the following REST API:
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
                    var token    = req.headers.authorization_token;

                    // check parameters
                    if (typeof req.params           !== 'object' ||
                        typeof req.params.text      !== 'string' ||
                        typeof req.params.recipient !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }
                    // if client comes from a remote site the params "creator" is needed
                    if (compComNethctiRemotes.isClientRemote(username, token) &&
                        typeof req.params.creator !== 'string') {

                        var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        logger.warn(IDLOG, 'creating new post-it from remote site "' + remoteSiteName + '" user "' + username + '" ' +
                                           'for recipient user "' + req.params.recipient + '": bad request');
                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    var creator, remoteSiteName;
                    var isRemote = false;

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        remoteSiteName = compComNethctiRemotes.getSiteName(username, token);
                        creator  = req.params.creator + '@' + remoteSiteName;
                        isRemote = true;
                    }
                    else {
                        // check the postit & administration postit authorization
                        if (compAuthorization.authorizePostitUser(username)      !== true &&
                            compAuthorization.authorizeAdminPostitUser(username) !== true) {

                            logger.warn(IDLOG, '"postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }
                        creator = username;
                    }

                    var data = {
                        text:      req.params.text,
                        creator:   creator,
                        recipient: req.params.recipient
                    };

                    compPostit.newPostit(data, function (err) {
                        if (err) {
                            logger.error(IDLOG, 'creating new postit from ' +
                                               (isRemote ?
                                                   'remote site "' + remoteSiteName + '" user "' + username + '" creator "' + creator + '" ' :
                                                   'user "' + username + '" '
                                               ) +
                                               'to "' + data.recipient + '"');
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());

                        } else {
                            logger.info(IDLOG, 'new postit from ' +
                                               (isRemote ?
                                                   'remote site "' + remoteSiteName + '" user "' + username + '" creator "' + creator + '" ' :
                                                   'user "' + username + '" '
                                               ) +
                                               'to "' + data.recipient + '" has been successfully created');
                            compUtil.net.sendHttp201(IDLOG, res);
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Create a new post-it for a recipient of a remote site by the following REST API:
            *
            *     remote_create
            *
            * @method remote_create
            * @param {object}   req  The client request
            * @param {object}   res  The client response
            * @param {function} next Function to run the next handler in the chain
            */
            remote_create: function (req, res, next) {
                try {
                    var username = req.headers.authorization_user;
                    var token    = req.headers.authorization_token;

                    // check parameters
                    if (typeof req.params           !== 'object' ||
                        typeof req.params.text      !== 'string' ||
                        typeof req.params.site      !== 'string' ||
                        typeof req.params.recipient !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }
                    var remoteSiteName = compComNethctiRemotes.getSiteName(username, token);

                    // check if the request coming from a remote site
                    if (compComNethctiRemotes.isClientRemote(username, token)) {

                        logger.warn(IDLOG, 'creating new postit for a remote user "' + req.params.recipient + '" ' +
                                           'of the remote site "' + req.params.site + '" by the remote site "' + remoteSiteName + '": ' +
                                           'authorization failed for user "' + username + '"');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }
                    else {
                        // check the remote_site, postit & administration postit authorizations
                        if (compAuthorization.authorizeRemoteSiteUser(username)      !== true ||
                               (compAuthorization.authorizePostitUser(username)      !== true &&
                                compAuthorization.authorizeAdminPostitUser(username) !== true)) {

                            logger.warn(IDLOG, '"remote_site" or ("postit" & "admin_postit") authorizations failed for user "' + username + '"');
                            compUtil.net.sendHttp403(IDLOG, res);
                            return;
                        }

                        var data = {
                            site:      req.params.site,
                            text:      req.params.text,
                            creator:   username,
                            recipient: req.params.recipient
                        };

                        // get all extensions of all remote sites
                        compComNethctiRemotes.newRemotePostit(data, function (err) {
                            if (err) {
                                logger.error(IDLOG, 'creating new remote post-it from user "' + username +
                                                    '" for remote user "' + data.recipient + '" of remote site "' + data.site + '": ' + err);
                                compUtil.net.sendHttp500(IDLOG, res, err.toString());
                            }
                            else {
                                logger.info(IDLOG, 'new remote postit by "' + username + '" to remote user "' + data.recipient + '" ' +
                                                   ' of remote site "' + data.site + '" has been successfully created');
                                compUtil.net.sendHttp201(IDLOG, res);
                            }
                        });
                    }
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Changes the specified post-it by the following REST API:
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
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (   typeof req.params      !== 'object'
                        || typeof req.params.id   !== 'string'
                        || typeof req.params.text !== 'string') {

                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    var id      = req.params.id;
                    var newText = req.params.text;

                    // check the postit & administration postit authorization
                    if (   compAuthorization.authorizePostitUser(username)      !== true
                        && compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, 'modifying postit: "postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {
                        logger.info(IDLOG, 'modifying postit: "admin_postit" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizePostitUser(username) === true) {
                        logger.info(IDLOG, 'modifying postit: "postit" authorization successfully for user "' + username + '"');
                    }

                    compPostit.getPostit(id, function (err, result) {

                        if (err) {
                            logger.error(IDLOG, 'getting post-it with db id "' + id + '" to modify by user "' + username + '"');
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());

                        } else {
                            // check the user authorization. If the user has the "admin_postit" authorization he can modify the postit.
                            // If the user has only the "postit" authorization he can modify only his created postit
                            if (compAuthorization.authorizeAdminPostitUser(username) === true
                                || (
                                    compAuthorization.authorizePostitUser(username) === true
                                    && result.creator === username
                                   )
                                ) {

                                logger.info(IDLOG, 'modify postit with db id "' + id + '" by user "' + username + '"');
                                modifyPostit(id, newText, username, res);

                            } else {
                                logger.warn(IDLOG, 'modifying postit with db id "' + id  + '": user "' + username + '" has not the permission');
                                compUtil.net.sendHttp403(IDLOG, res);
                            }
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            },

            /**
            * Deletes the specified post-it by the following REST API:
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
                    var username = req.headers.authorization_user;

                    // check parameters
                    if (typeof req.params !== 'object' || typeof req.params.id !== 'string') {
                        compUtil.net.sendHttp400(IDLOG, res);
                        return;
                    }

                    var id = req.params.id;

                    // check the postit & administration postit authorization
                    if (   compAuthorization.authorizePostitUser(username)      !== true
                        && compAuthorization.authorizeAdminPostitUser(username) !== true) {

                        logger.warn(IDLOG, '"postit" & "admin_postit" authorizations failed for user "' + username + '" !');
                        compUtil.net.sendHttp403(IDLOG, res);
                        return;
                    }

                    if (compAuthorization.authorizeAdminPostitUser(username) === true) {
                        logger.info(IDLOG, '"admin_postit" authorization successfully for user "' + username + '"');
                    }

                    if (compAuthorization.authorizePostitUser(username) === true) {
                        logger.info(IDLOG, '"postit" authorization successfully for user "' + username + '"');
                    }

                    compPostit.getPostit(id, function (err, result) {

                        if (err) {
                            logger.error(IDLOG, 'getting post-it with db id "' + id + '" to delete by user "' + username + '"');
                            compUtil.net.sendHttp500(IDLOG, res, err.toString());

                        } else {
                            // check the user authorization. If the user has the "admin_postit" authorization he can delete the postit.
                            // If the user has only the "postit" authorization he can delete only his created postit
                            if (compAuthorization.authorizeAdminPostitUser(username) === true
                                || (
                                    compAuthorization.authorizePostitUser(username) === true
                                    && result.creator === username
                                   )
                                ) {

                                logger.info(IDLOG, 'delete postit with db id "' + id + '" by user "' + username + '"');
                                deletePostit(id, username, res);

                            } else {
                                logger.warn(IDLOG, 'deleting postit with db id "' + id  + '": user "' + username + '" hasn\'t the permission');
                                compUtil.net.sendHttp403(IDLOG, res);
                            }
                        }
                    });
                } catch (err) {
                    logger.error(IDLOG, err.stack);
                    compUtil.net.sendHttp500(IDLOG, res, err.toString());
                }
            }
        }
        exports.api                  = postit.api;
        exports.new                  = postit.new;
        exports.read                 = postit.read;
        exports.create               = postit.create;
        exports.modify               = postit.modify;
        exports.delete               = postit.delete;
        exports.setLogger            = setLogger;
        exports.setCompUtil          = setCompUtil;
        exports.setCompPostit        = setCompPostit;
        exports.remote_create        = postit.remote_create;
        exports.setCompAuthorization = setCompAuthorization;
        exports.setCompComNethctiRemotes = setCompComNethctiRemotes;

    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
})();

/**
* Delete the specified post-it.
*
* @method deletePostit
* @param {string} id       The unique identifier of the post-it
* @param {string} username The name of the user
* @param {object} res      The client response
* @static
*/
function deletePostit(id, username, res) {
    try {
        // check parameters
        if (typeof id !== 'string' || typeof username !== 'string' || typeof res !== 'object') {
            throw new Error('wrong parameters');
        }

        compPostit.deletePostit(id, function (err) {
            try {
                if (err) { throw err; }

                logger.info(IDLOG, 'postit with db id "' + id + '" has been successfully deleted by user "' + username + '"');
                compUtil.net.sendHttp200(IDLOG, res);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}

/**
* Modify the specified post-it.
*
* @method modifyPostit
* @param {string} id       The unique identifier of the post-it
* @param {string} text     The replacing text of the post-it
* @param {string} username The name of the user
* @param {object} res      The client response
* @static
*/
function modifyPostit(id, text, username, res) {
    try {
        // check parameters
        if (   typeof id       !== 'string' || typeof text !== 'string'
            || typeof username !== 'string' || typeof res  !== 'object') {

            throw new Error('wrong parameters');
        }

        compPostit.modifyPostit(id, text, function (err) {
            try {
                if (err) { throw err; }

                logger.info(IDLOG, 'postit with db id "' + id + '" has been successfully modified by user "' + username + '"');
                compUtil.net.sendHttp200(IDLOG, res);

            } catch (err1) {
                logger.error(IDLOG, err1.stack);
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
        });

    } catch (err) {
        logger.error(IDLOG, err.stack);
        compUtil.net.sendHttp500(IDLOG, res, err.toString());
    }
}
