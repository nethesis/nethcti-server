/**
* Realizes communication with remote sites, sending real time local
* information and doing operations.
*
* @class arch_com_nethcti_remotes
* @module com_nethcti_remotes
*/
var comNethctiRemotes = require('./com_nethcti_remotes');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_nethcti_remotes]
*/
var IDLOG = '[arch_com_nethcti_remotes]';

module.exports = function (options, imports, register) {
    
    register(null, {
        comNethctiRemotes: {
            /**
            * It's the _getNumConnectedClients_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getNumConnectedClients
            */
            getNumConnectedClients: comNethctiRemotes.getNumConnectedClients,

            /**
            * It's the _getSiteName_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getSiteName
            */
            getSiteName: comNethctiRemotes.getSiteName,

            /**
            * It's the _newRemotePostit_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method newRemotePostit
            */
            newRemotePostit: comNethctiRemotes.newRemotePostit,

            /**
            * It's the _getAllRemoteSitesOperatorExtensions_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getAllRemoteSitesOperatorExtensions
            */
            getAllRemoteSitesOperatorExtensions: comNethctiRemotes.getAllRemoteSitesOperatorExtensions,

            /**
            * It's the _getAllRemoteSitesUserEndpoints_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getAllRemoteSitesUserEndpoints
            */
            getAllRemoteSitesUserEndpoints: comNethctiRemotes.getAllRemoteSitesUserEndpoints,

            /**
            * It's the _getAllRemoteSitesUsernames_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getAllRemoteSitesUsernames
            */
            getAllRemoteSitesUsernames: comNethctiRemotes.getAllRemoteSitesUsernames,

            /**
            * It's the _getAllRemoteSitesOperatorGroups_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getAllRemoteSitesOperatorGroups
            */
            getAllRemoteSitesOperatorGroups: comNethctiRemotes.getAllRemoteSitesOperatorGroups,

            /**
            * It's the _isClientRemote_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method isClientRemote
            */
            isClientRemote: comNethctiRemotes.isClientRemote,

            /**
            * It's the _on_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method on
            */
            on: comNethctiRemotes.on,

            /**
            * It's the _EVT\_ALL\_WS\_CLIENT\_DISCONNECTION_ property provided by _com\_nethcti\_ws_ module.
            *
            * @method EVT_ALL_WS_CLIENT_DISCONNECTION
            */
            EVT_ALL_WS_CLIENT_DISCONNECTION: comNethctiRemotes.EVT_ALL_WS_CLIENT_DISCONNECTION,

            /**
            * It's the _EVT\_WS\_CLIENT\_LOGGEDIN_ property provided by _com\_nethcti\_ws_ module.
            *
            * @method EVT_WS_CLIENT_LOGGEDIN
            */
            EVT_WS_CLIENT_LOGGEDIN: comNethctiRemotes.EVT_WS_CLIENT_LOGGEDIN
        }
    });

    try {
        var logger = console;

        if (imports.logger) { logger = imports.logger; }

        // wait for the authentication component ready event
        imports.authentication.on(imports.authentication.EVT_COMP_READY, function () {
            comNethctiRemotes.setLogger(logger);
            comNethctiRemotes.setAuthe(imports.authentication);
            comNethctiRemotes.setAstProxy(imports.astProxy);
            comNethctiRemotes.setCompComNethctiWs(imports.com_nethcti_ws);
            comNethctiRemotes.setCompAuthorization(imports.authorization);
            comNethctiRemotes.config('/etc/nethcti/remote_sites.json');
            //comNethctiRemotes.setCompUser(imports.user);
            //comNethctiRemotes.setCompPostit(imports.postit);
            //comNethctiRemotes.setCompVoicemail(imports.voicemail);
            comNethctiRemotes.start();
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
