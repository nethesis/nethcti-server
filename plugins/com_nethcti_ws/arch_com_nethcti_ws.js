/**
* Supply the real time informations about extensions, queues, trunks and parkings.
*
* @class arch_com_nethcti_ws
* @module com_nethcti_ws
*/
var comNethctiWs = require('./com_nethcti_ws');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_com_nethcti_ws]
*/
var IDLOG = '[arch_com_nethcti_ws]';

module.exports = function (options, imports, register) {
    
    register(null, {
        com_nethcti_ws: {
            /**
            * It's the _getNumConnectedClients_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method getNumConnectedClients
            */
            getNumConnectedClients: comNethctiWs.getNumConnectedClients,

            /**
            * It's the _on_ method provided by _com\_nethcti\_ws_ module.
            *
            * @method on
            */
            on: comNethctiWs.on,

            /**
            * It's the _EVT\_ALL\_WS\_CLIENT\_DISCONNECTION_ property provided by _com\_nethcti\_ws_ module.
            *
            * @method EVT_ALL_WS_CLIENT_DISCONNECTION
            */
            EVT_ALL_WS_CLIENT_DISCONNECTION: comNethctiWs.EVT_ALL_WS_CLIENT_DISCONNECTION,

            /**
            * It's the _EVT\_WSS\_CLIENT\_CONNECTED_ property provided by _com\_nethcti\_ws_ module.
            *
            * @method EVT_WSS_CLIENT_CONNECTED
            */
            EVT_WSS_CLIENT_CONNECTED: comNethctiWs.EVT_WSS_CLIENT_CONNECTED,

            /**
            * It's the _EVT\_WS\_CLIENT\_LOGGEDIN_ property provided by _com\_nethcti\_ws_ module.
            *
            * @method EVT_WS_CLIENT_LOGGEDIN
            */
            EVT_WS_CLIENT_LOGGEDIN: comNethctiWs.EVT_WS_CLIENT_LOGGEDIN
        }
    });

    try {
        var logger = console;

        if (imports.logger) { logger = imports.logger; }

        // wait for the authentication component ready event
        imports.authentication.on(imports.authentication.EVT_COMP_READY, function () {
            comNethctiWs.setLogger(logger);
            comNethctiWs.setAuthe(imports.authentication);
            comNethctiWs.config('/etc/nethcti/services.json');
            comNethctiWs.configPrivacy('/etc/nethcti/nethcti.json');
            comNethctiWs.setCompUser(imports.user);
            comNethctiWs.setCompPostit(imports.postit);
            comNethctiWs.setAstProxy(imports.astProxy);
            comNethctiWs.setCompVoicemail(imports.voicemail);
            comNethctiWs.setCompAuthorization(imports.authorization);
            comNethctiWs.start();
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
