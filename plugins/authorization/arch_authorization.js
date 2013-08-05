/**
* The architect component that exposes _authorization_ module.
*
* @class arch_authorization
* @module authorization
*/
var authorization      = require('./authorization');
var authorizationTypes = require('./authorization_types');

/**
* The module identifier used by the logger.
*
* @property IDLOG
* @type string
* @private
* @final
* @readOnly
* @default [arch_authorization]
*/
var IDLOG = '[arch_authorization]';

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        authorization: {
            /**
            * It's the _authorizeCdrUser_ method provided by _authorization_ module.
            *
            * @method authorizeCdrUser
            */
            authorizeCdrUser: authorization.authorizeCdrUser,

            /**
            * It's the _authorizeOpExtensionsUser_ method provided by _authorization_ module.
            *
            * @method authorizeOpExtensionsUser
            */
            authorizeOpExtensionsUser: authorization.authorizeOpExtensionsUser,

            /**
            * It's the _authorizeOpParkingsUser_ method provided by _authorization_ module.
            *
            * @method authorizeOpParkingsUser
            */
            authorizeOpParkingsUser: authorization.authorizeOpParkingsUser,

            /**
            * It's the _authorizePhoneRedirectUser_ method provided by _authorization_ module.
            *
            * @method authorizePhoneRedirectUser
            */
            authorizePhoneRedirectUser: authorization.authorizePhoneRedirectUser,

            /**
            * It's the _authorizeDndUser_ method provided by _authorization_ module.
            *
            * @method authorizeDndUser
            */
            authorizeDndUser: authorization.authorizeDndUser,

            /**
            * It's the _authorizeOpQueuesUser_ method provided by _authorization_ module.
            *
            * @method authorizeOpQueuesUser
            */
            authorizeOpQueuesUser: authorization.authorizeOpQueuesUser,

            /**
            * It's the _authorizeOperatorGroupsUser_ method provided by _authorization_ module.
            *
            * @method authorizeOperatorGroupsUser
            */
            authorizeOperatorGroupsUser: authorization.authorizeOperatorGroupsUser,

            /**
            * It's the _authorizePickupUser_ method provided by _authorization_ module.
            *
            * @method authorizePickupUser
            */
            authorizePickupUser: authorization.authorizePickupUser,

            /**
            * It's the _authorizeAdvancedOperatorUser_ method provided by _authorization_ module.
            *
            * @method authorizeAdvancedOperatorUser
            */
            authorizeAdvancedOperatorUser: authorization.authorizeAdvancedOperatorUser,

            /**
            * It's the _authorizeAdminCdrUser_ method provided by _authorization_ module.
            *
            * @method authorizeAdminCdrUser
            */
            authorizeAdminCdrUser: authorization.authorizeAdminCdrUser,

            /**
            * It's the _authorizePhonebookUser_ method provided by _authorization_ module.
            *
            * @method authorizePhonebookUser
            */
            authorizePhonebookUser: authorization.authorizePhonebookUser,

            /**
            * It's the _authorizeVoicemailUser_ method provided by _authorization_ module.
            *
            * @method authorizeVoicemailUser
            */
            authorizeVoicemailUser: authorization.authorizeVoicemailUser,

            /**
            * It's the _authorizeCallerNoteUser_ method provided by _authorization_ module.
            *
            * @method authorizeCallerNoteUser
            */
            authorizeCallerNoteUser: authorization.authorizeCallerNoteUser,

            /**
            * It's the _authorizePostitUser_ method provided by _authorization_ module.
            *
            * @method authorizePostitUser
            */
            authorizePostitUser: authorization.authorizePostitUser,

            /**
            * It's the _authorizeAdminPostitUser_ method provided by _authorization_ module.
            *
            * @method authorizeAdminPostitUser
            */
            authorizeAdminPostitUser: authorization.authorizeAdminPostitUser,

            /**
            * It's the _authorizeCustomerCardUser_ method provided by _authorization_ module.
            *
            * @method authorizeCustomerCardUser
            */
            authorizeCustomerCardUser: authorization.authorizeCustomerCardUser,

            /**
            * It's the _authorizeStreamingUser_ method provided by _authorization_ module.
            *
            * @method authorizeStreamingUser
            */
            authorizeStreamingUser: authorization.authorizeStreamingUser,

            /**
            * It's the _authorizeStreamingSourceUser_ method provided by _authorization_ module.
            *
            * @method authorizeStreamingSourceUser
            */
            authorizeStreamingSourceUser: authorization.authorizeStreamingSourceUser,

            /**
            * It's the _getAuthorizedStreamingSources_ method provided by _authorization_ module.
            *
            * @method getAuthorizedStreamingSources
            */
            getAuthorizedStreamingSources: authorization.getAuthorizedStreamingSources,

            /**
            * It's the _getAuthorizedOperatorGroups_ method provided by _authorization_ module.
            *
            * @method getAuthorizedOperatorGroups
            */
            getAuthorizedOperatorGroups: authorization.getAuthorizedOperatorGroups,

            /**
            * It's the _authorizedCustomerCards_ method provided by _authorization_ module.
            *
            * @method authorizedCustomerCards
            */
            authorizedCustomerCards: authorization.authorizedCustomerCards,

            /**
            * It's the _verifyUserEndpointExten_ method provided by _authorization_ module.
            *
            * @method verifyUserEndpointExten
            */
            verifyUserEndpointExten: authorization.verifyUserEndpointExten,

            /**
            * It's the _authorizeChatUser_ method provided by _authorization_ module.
            *
            * @method
            */
            authorizeChatUser: authorization.authorizeChatUser,

            /**
            * It's the _getUserAuthorizations_ method provided by _authorization_ module.
            *
            * @method getUserAuthorizations
            */
            getUserAuthorizations: authorization.getUserAuthorizations
        }
    });

    try {
        imports.user.on('users_ready', function () {
            authorization.setLogger(logger);
            authorization.setUserModule(imports.user);
            authorization.config({ type: 'file', path: '/etc/nethcti/users.json' });
        });
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
