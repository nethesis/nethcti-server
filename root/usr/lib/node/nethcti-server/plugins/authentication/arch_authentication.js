/**
 * The architect component that exposes _authentication_ module.
 *
 * @class arch_authentication
 * @module authentication
 */
var authentication = require('./authentication');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [arch_authentication]
 */
var IDLOG = '[arch_authentication]';

module.exports = function(options, imports, register) {

  var logger = console;
  if (imports.logger) {
    logger = imports.logger;
  }

  // public interface for other architect components
  register(null, {
    authentication: authentication
  });

  try {
    imports.dbconn.on(imports.dbconn.EVT_READY, function() {
      authentication.setLogger(logger.ctilog);
      authentication.setCompDbconn(imports.dbconn);
      // authentication.configRemoteAuthentications('/etc/nethcti/remote_authentications.json');
      authentication.config('/etc/nethcti/authentication.json');
      authentication.initFreepbxAdminAuthentication();
    });
    imports.dbconn.on(imports.dbconn.EVT_RELOADED, function() {
      authentication.reload();
    });
  } catch (err) {
    logger.log.error(IDLOG, err.stack);
  }
};
