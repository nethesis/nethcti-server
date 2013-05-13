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

module.exports = function (options, imports, register) {
    
    var logger = console;
    if (imports.logger) { logger = imports.logger; }

    // public interface for other architect components
    register(null, {
        customerCard: {
            /**
            * It's the _getCustomerCardByNum_ method provided by _customer\_card_ module.
            *
            * @method getCustomerCardByNum
            */
            getCustomerCardByNum: customerCard.getCustomerCardByNum
        }
    });

    try {
        var dbconn = imports.dbconn;

        customerCard.setLogger(logger);
        customerCard.setDbconn(dbconn);
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
