/**
 * The architect component that exposes _customer\_card_ module.
 *
 * @class arch_customer_card
 * @module customer_card
 */
var customerCard = require('./customer_card');

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [arch_customer_card]
 */
var IDLOG = '[arch_customer_card]';

module.exports = function(options, imports, register) {

  var logger = console;
  if (imports.logger) {
    logger = imports.logger;
  }

  // public interface for other architect components
  register(null, {
    customerCard: customerCard
  });

  try {
    imports.dbconn.on(imports.dbconn.EVT_READY, function() {
      customerCard.setLogger(logger);
      customerCard.config('/etc/nethcti/services.json');
      customerCard.configPrivacy('/etc/nethcti/nethcti.json');
      customerCard.setCompAuthorization(imports.authorization);
      customerCard.setCompUser(imports.user);
      customerCard.setDbconn(imports.dbconn);
      customerCard.start();
    });
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
};
