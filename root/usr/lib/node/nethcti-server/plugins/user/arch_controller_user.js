/**
 * The architect component that exposes _user_ module.
 *
 * @class arch_controller_user
 * @module user
 */
var userPresence = require('./user_presence');
var endpointTypes = require('./endpoint_types');
var controllerUser = require('./controller_user');

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

module.exports = function(options, imports, register) {

  var logger;
  var user = controllerUser;
  user.ENDPOINT_TYPES = endpointTypes.TYPES;
  user.isValidUserPresence = userPresence.isValidUserPresence;
  user.isValidUserPresenceOnBusy = userPresence.isValidUserPresenceOnBusy;
  user.isValidUserPresenceOnUnavailable = userPresence.isValidUserPresenceOnUnavailable;
  user.USER_PRESENCE_STATUS = userPresence.STATUS;
  user.USER_PRESENCE_ONBUSY_STATUS = userPresence.STATUS_ONBUSY;
  user.USER_PRESENCE_ONUNAVAILABLE_STATUS = userPresence.STATUS_ONUNAVAILABLE;

  // public interface for other architect components
  register(null, {
    user: user
  });
  try {
    logger = console;
    if (imports.logger) {
      logger = imports.logger;
    }
    controllerUser.setLogger(logger);
    controllerUser.setCompAstProxy(imports.astProxy);
    controllerUser.setCompDbconn(imports.dbconn);
    imports.astProxy.on(imports.astProxy.EVT_READY, function() {
      controllerUser.config('/etc/nethcti/users.json');
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
};
