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
            * @param {string} ccName The name of the customer card to search
            * @param {string} num The number used to search the customer card.
            * @param {function} cb The callback function
            */
            getCustomerCardByNum: customerCard.getCustomerCardByNum,

            /**
            * It's the _getAllCustomerCards_ method provided by _customer\_card_ module.
            *
            * @method getAllCustomerCards
            * @param {string} username The identifier of the user
            * @param {string} num The number used to search the customer cards.
            * @param {function} cb The callback function
            */
            getAllCustomerCards: customerCard.getAllCustomerCards
        }
    });

    try {
        var dbconn = imports.dbconn;

        customerCard.setLogger(logger);
        customerCard.config('/etc/nethcti/nethcti.json');
        customerCard.setCompAuthorization(imports.authorization);
        customerCard.setDbconn(dbconn);
        customerCard.start();
    } catch (err) {
        logger.error(IDLOG, err.stack);
    }
}
