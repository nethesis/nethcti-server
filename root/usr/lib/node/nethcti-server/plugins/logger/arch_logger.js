/**
 * The architect component that exposes _logger_ module.
 *
 * @class arch_logger
 * @module logger
 */
var controllerLogger = require('./controller_logger');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [arch_logger]
 */
var IDLOG = '[arch_logger]';

module.exports = function(options, imports, register) {

  // public interface for other architect components
  register(null, {
    logger: {
      ctilog: controllerLogger.ctilog,
      reload: controllerLogger.reload
    }
  });
};
