/**
* The architect component that exposes _user_ module.
*
* @class arch_controller_user
* @module user
*/
var endpointTypes  = require('./endpoint_types');
var controllerUser = require('./controller_user');
var endpointTypes  = require('./endpoint_types');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_controller_user]
*/
var IDLOG = '[arch_controller_user]';

module.exports = function (options, imports, register) {

    // public interface for other architect components
    register(null, {
        user: {
            /**
            * It's the _on_ method provided by _controller\_user_ module.
            *
            * @method on
            * @param {string} type The name of the event
            * @param {function} cb The callback to execute in response to the event
            * @return {object} A subscription handle capable of detaching that subscription
            */
            on: controllerUser.on,

            /**
            * It's the _setAuthorizationToUser_ method provided by _controller\_user_ module.
            *
            * @method setAuthorizationToUser
            */
            setAuthorization: controllerUser.setAuthorization,

            /**
            * It's the _getAuthorization_ method provided by _controller\_user_ module.
            *
            * @method getAuthorization
            */
            getAuthorization: controllerUser.getAuthorization,

            /**
            * It's the _setConfigurations_ method provided by _controller\_user_ module.
            *
            * @method setConfigurations
            */
            setConfigurations: controllerUser.setConfigurations,

            /**
            * It's the _getConfigurations_ method provided by _controller\_user_ module.
            *
            * @method getConfigurations
            */
            getConfigurations: controllerUser.getConfigurations,

            /**
            * It's the _hasExtensionEndpoint_ method provided by _controller\_user_ module.
            *
            * @method hasExtensionEndpoint
            */
            hasExtensionEndpoint: controllerUser.hasExtensionEndpoint,

            /**
            * It's the _hasVoicemailEndpoint_ method provided by _controller\_user_ module.
            *
            * @method hasVoicemailEndpoint
            */
            hasVoicemailEndpoint: controllerUser.hasVoicemailEndpoint,

            /**
            * It's the _getVoicemailList_ method provided by _controller\_user_ module.
            *
            * @method getVoicemailList
            */
            getVoicemailList: controllerUser.getVoicemailList,

            /**
            * It's the _getVoicemailAssociations_ method provided by _controller\_user_ module.
            *
            * @method getVoicemailAssociations
            */
            getVoicemailAssociations: controllerUser.getVoicemailAssociations,

            /**
            * It's the _addEndpointVoicemail_ method provided by _controller\_user_ module.
            *
            * @method addEndpointVoicemail
            */
            addEndpointVoicemail: controllerUser.addEndpointVoicemail,

            /**
            * It's the _getEndpointsJSON_ method provided by _controller\_user_ module.
            *
            * @method getEndpointsJSON
            */
            getEndpointsJSON: controllerUser.getEndpointsJSON,

            /**
            * It's the _getAllUsersEndpointsJSON_ method provided by _controller\_user_ module.
            *
            * @method getAllUsersEndpointsJSON
            */
            getAllUsersEndpointsJSON: controllerUser.getAllUsersEndpointsJSON,

            /**
            * It's the _isValidEndpointType_ method provided by _endpoint\_types_ module.
            *
            * @method isValidEndpointType
            */
            isValidEndpointType: endpointTypes.isValidEndpointType,

            /**
            * It's the _ENDPOINT\_TYPES_ method provided by _endpoint\_types_ module.
            *
            * @method ENDPOINT_TYPES
            */
            ENDPOINT_TYPES: endpointTypes.TYPES,

            /**
            * It's the _getUsernames_ method provided by _controller\_user_ module.
            *
            * @method getUsernames
            */
            getUsernames: controllerUser.getUsernames,

            /**
            * It's the _getUsernamesWithData_ method provided by _controller\_user_ module.
            *
            * @method getUsernamesWithData
            */
            getUsernamesWithData: controllerUser.getUsernamesWithData,

            /**
            * It's the _setNethctiPresence_ method provided by _controller\_user_ module.
            *
            * @method setNethctiPresence
            */
            setNethctiPresence: controllerUser.setNethctiPresence,

            /**
            * It's the _isValidEndpointNethctiStatus_ method provided by _endpoint\_types_ module.
            *
            * @method isValidNethctiPresence
            */
            isValidNethctiPresence: endpointTypes.isValidEndpointNethctiStatus,

            /**
            * It's the _isValidEndpointNethctiDevice_ method provided by _endpoint\_types_ module.
            *
            * @method isValidEndpointNethctiDevice
            */
            isValidEndpointNethctiDevice: endpointTypes.isValidEndpointNethctiDevice,

            /**
            * It's the _getAllEndpointsNethcti_ method provided by _controller\_user_ module.
            *
            * @method getAllEndpointsNethcti
            */
            getAllEndpointsNethcti: controllerUser.getAllEndpointsNethcti,

            /**
            * It's the _getAllEndpointsExtension_ method provided by _controller\_user_ module.
            *
            * @method getAllEndpointsExtension
            */
            getAllEndpointsExtension: controllerUser.getAllEndpointsExtension,

            /**
            * It's the _getUsersUsingEndpointExtension_ method provided by _controller\_user_ module.
            *
            * @method getUsersUsingEndpointExtension
            */
            getUsersUsingEndpointExtension: controllerUser.getUsersUsingEndpointExtension,

            /**
            * It's the _EVT\_USERS\_READY_ property provided by _controller\_user_ module.
            *
            * @property EVT_USERS_READY
            */
            EVT_USERS_READY: controllerUser.EVT_USERS_READY,

            /**
            * It's the _EVT\_ENDPOINT\_PRESENCE\_CHANGED_ property provided by _controller\_user_ module.
            *
            * @property EVT_ENDPOINT_PRESENCE_CHANGED
            */
            EVT_ENDPOINT_PRESENCE_CHANGED: controllerUser.EVT_ENDPOINT_PRESENCE_CHANGED
        }
    });

    try {
        var logger = console;
        if (imports.logger) { logger = imports.logger; }

        controllerUser.setLogger(logger);
        controllerUser.config({ type: 'file', path: '/etc/nethcti/users.json' });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
