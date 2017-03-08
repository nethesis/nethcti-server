/**
 * Provides phonebook functions through REST API.
 *
 * @module com_phonebook_rest
 * @submodule plugins_rest
 */

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [plugins_rest/phonebook]
 */
var IDLOG = '[plugins_rest/phonebook]';

/**
 * The logger. It must have at least three methods: _info, warn and error._
 *
 * @property logger
 * @type object
 * @private
 * @default console
 */
var logger = console;

/**
 * The phonebook architect component used for phonebook functions.
 *
 * @property compPhonebook
 * @type object
 * @private
 */
var compPhonebook;

/**
 * The utility architect component.
 *
 * @property compUtil
 * @type object
 * @private
 */
var compUtil;

/**
 * Set the logger to be used.
 *
 * @method setLogger
 * @param {object} log The logger object. It must have at least
 * three methods: _info, warn and error_ as console object.
 * @static
 */
function setLogger(log) {
  try {
    if (typeof log === 'object' && typeof log.info === 'function' && typeof log.warn === 'function' && typeof log.error === 'function') {

      logger = log;
      logger.info(IDLOG, 'new logger has been set');

    } else {
      throw new Error('wrong logger object');
    }
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Set phonebook architect component used by phonebook functions.
 *
 * @method setCompPhonebook
 * @param {object} cp The phonebook architect component.
 */
function setCompPhonebook(cp) {
  try {
    compPhonebook = cp;
    logger.info(IDLOG, 'set phonebook architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

/**
 * Sets the utility architect component.
 *
 * @method setCompUtil
 * @param {object} comp The utility architect component.
 */
function setCompUtil(comp) {
  try {
    compUtil = comp;
    logger.info(IDLOG, 'set util architect component');
  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
}

(function() {
  try {
    /**
        * REST plugin that provides phonebook functions through the following REST API:
        *
        * # GET requests
        *
        * 1. [`phonebook/search/:term[?view=company&limit=n&offset=n]`](#searchget)
        * 1. [`phonebook/speeddials`](#speeddialsget)
        * 1. [`phonebook/contact/:id`](#contactget)
        * 1. [`phonebook/cticontact/:id`](#cticontactget)
        * 1. [`phonebook/searchstartswith/:term[?view=company&limit=n&offset=n]`](#searchstartswithget)
        * 1. [`phonebook/searchstartswith_digit/:view[?limit=n&offset=n]`](#searchstartswith_digitget)
        *
        * ---
        *
        * ### <a id="searchget">**`phonebook/search/:term[?view=company&limit=n&offset=n]`**</a>
        *
        * The client receives all phonebook contacts found in the _centralized_ or _NethCTI_ phonebooks.
        * It supports pagination with limit and offset.
        * It offers a view where results are grouped by company.
        *
        * It returns all database entries that contain the specified _term_ in the fields _name, company,
        * workphone, homephone_ and _cellphone_.
        *
        * Example JSON response:
        *
        * * ```phonebook/search/net?view=company&offset=0&limit=5```
        *
        *
        *     {
        "count": 353,
        "rows": [
            {
                "id": 5946,
                "company": "",
                "workstreet": "",
                "workcity": "",
                "workprovince": "",
                "workcountry": "",
                "url": "",
                "contacts": "[{\"id\": 5946,\"name\": \"\", \"source\": \"centralized\"}]"
            },
            ...
        ]
     }
        *
        * * ```phonebook/search/net?offset=0&limit=5```
        *
        *
        *     {
        "count": 5,
        "rows": [
            {
                "id": 4846,
                "owner_id": "",
                "type": "",
                "homeemail": "",
                "workemail": "",
                "homephone": "",
                "workphone": "",
                "cellphone": "",
                "fax": "",
                "title": "",
                "company": "",
                "notes": "",
                "name": "",
                "homestreet": "",
                "homepob": "",
                "homecity": "",
                "homeprovince": "",
                "homepostalcode": "",
                "homecountry": "",
                "workstreet": "",
                "workpob": "",
                "workcity": "",
                "workprovince": "",
                "workpostalcode": "",
                "workcountry": "",
                "url": "",
                "extension": "",
                "speeddial_num": "",
                "source": "centralized"
            },
            ...
        ]
     }
        *
        *
        * ---
        *
        * ### <a id="speeddialsget">**`phonebook/speeddials`**</a>
        *
        * The client receives all speeddial contacts owned by him. The contacts are in the _NethCTI_ phonebook.
        * It returns all database entries that have the field _type_ equal to "speeddial".
        *
        * Example JSON response:
        *
        *     [
            {
                  "id": 1
                  "owner_id": "alessandro"
                  "type": "speeddial"
                  "homeemail": ""
                  "workemail": ""
                  "homephone": ""
                  "workphone": ""
                  "cellphone": "123456"
                  "fax": ""
                  "title": ""
                  "company": ""
                  "notes": ""
                  "name": "ale"
                  "homestreet": ""
                  "homepob": ""
                  "homecity": ""
                  "homeprovince": ""
                  "homepostalcode": ""
                  "homecountry": ""
                  "workstreet": ""
                  "workpob": ""
                  "workcity": ""
                  "workprovince": ""
                  "workpostalcode": ""
                  "workcountry": ""
                  "url": ""
                  "extension": ""
                  "speeddial_num": "123456"
            }
      ]
        *
        * ---
        *
        * ### <a id="contactget">**`phonebook/contact/:id`**</a>
        *
        * The client receives the details of the contact that is in the _phonebook_ phonebook. The parameter
        * _id_ is the database identifier of the contact.
        *
        * Example JSON response:
        *
        *     {
        "id": 1,
        "owner_id": "alessandro",
        "type": "source",
        "homeemail": "",
        "workemail": "",
        "homephone": "",
        "workphone": "",
        "cellphone": "123456",
        "fax": "",
        "title": "",
        "company": "",
        "notes": "",
        "name": "ale",
        "homestreet": "",
        "homepob": "",
        "homecity": "",
        "homeprovince": "",
        "homepostalcode": "",
        "homecountry": "",
        "workstreet": "",
        "workpob": "",
        "workcity": "",
        "workprovince": "",
        "workpostalcode": "",
        "workcountry": "",
        "url": "",
        "extension": "",
        "speeddial_num": "123456"
     }
        *
        * ---
        *
        * ### <a id="cticontactget">**`phonebook/cticontact/:id`**</a>
        *
        * The client receives the details of the contact that is in the _NethCTI_ phonebook. The parameter
        * _id_ is the database identifier of the contact.
        *
        * Example JSON response:
        *
        *     {
        "id": 1,
        "owner_id": "",
        "type": "speeddial",
        "homeemail": "",
        "workemail": "",
        "homephone": "",
        "workphone": "",
        "cellphone": "123456",
        "fax": "",
        "title": "",
        "company": "",
        "notes": "",
        "name": "ale",
        "homestreet": "",
        "homepob": "",
        "homecity": "",
        "homeprovince": "",
        "homepostalcode": "",
        "homecountry": "",
        "workstreet": "",
        "workpob": "",
        "workcity": "",
        "workprovince": "",
        "workpostalcode": "",
        "workcountry": "",
        "url": "",
        "extension": "",
        "speeddial_num": "123456"
     }
        *
        * ---
        *
        * ### <a id="searchstartswithget">**`phonebook/searchstartswith/:term[?view=company&limit=n&offset=n]`**</a>
        *
        * The client receives all phonebook contacts found in the _centralized_ or _NethCTI_ phonebooks.
        * It returns all database entries whose _name_ and _company_ fields starts with the specified term.
        * It offers a view where results are grouped by company.
        *
        * Example JSON response:
        *
        * * ```phonebook/searchstartswith/A?offset=40&limit=5&view=company```
        *
        *
        *     {
        "count": 353,
        "rows": [
            {
                "id": 5946,
                "company": "",
                "workstreet": "",
                "workcity": "",
                "workprovince": "",
                "workcountry": "",
                "url": "",
                "contacts": "[{\"id\": 5946,\"name\": \"\", \"source\": \"centralized\"}]"
            },
            ...
        ]
     }
        *
        * * ```phonebook/searchstartswith/A?offset=40&limit=5```
        *
        *
        *     {
        "count": 869,
        "rows": [
            {
                "id": 4846,
                "owner_id": "",
                "type": "",
                "homeemail": "",
                "workemail": "",
                "homephone": "",
                "workphone": "",
                "cellphone": "",
                "fax": "",
                "title": "",
                "company": "",
                "notes": "",
                "name": "",
                "homestreet": "",
                "homepob": "",
                "homecity": "",
                "homeprovince": "",
                "homepostalcode": "",
                "homecountry": "",
                "workstreet": "",
                "workpob": "",
                "workcity": "",
                "workprovince": "",
                "workpostalcode": "",
                "workcountry": "",
                "url": "",
                "extension": "",
                "speeddial_num": "",
                "source": "centralized"
            },
            ...
        ]
     }
        *
        * ---
        *
        * ### <a id="searchstartswith_digitget">**`phonebook/searchstartswith_digit/:view[?limit=n&offset=n]`**</a>
        *
        * The client receives all phonebook contacts found in the _centralized_ or _NethCTI_ phonebooks.
        * It returns all database entries whose _name_ and _company_ fields starts with a digit.
        * It offers results grouped by view. View can be "company" or "contacts".
        *
        * Example JSON response:
        *
        * * ```phonebook/searchstartswith_digit/company?offset=0&limit=5```
        *
        *
        *     {
        "count": 353,
        "rows": [
            {
                "id": 5946,
                "company": "",
                "workstreet": "",
                "workcity": "",
                "workprovince": "",
                "workcountry": "",
                "url": "",
                "contacts": "[{\"id\": 5946,\"name\": \"\", \"source\": \"centralized\"}]"
            },
            ...
        ]
     }
        *
        * * ```phonebook/searchstartswith_digit/contacts?offset=0&limit=5```
        *
        *
        *     {
        "count": 5,
        "rows": [
            {
                "id": 4846,
                "owner_id": "",
                "type": "",
                "homeemail": "",
                "workemail": "",
                "homephone": "",
                "workphone": "",
                "cellphone": "",
                "fax": "",
                "title": "",
                "company": "",
                "notes": "",
                "name": "",
                "homestreet": "",
                "homepob": "",
                "homecity": "",
                "homeprovince": "",
                "homepostalcode": "",
                "homecountry": "",
                "workstreet": "",
                "workpob": "",
                "workcity": "",
                "workprovince": "",
                "workpostalcode": "",
                "workcountry": "",
                "url": "",
                "extension": "",
                "speeddial_num": "",
                "source": "centralized"
            },
            ...
        ]
     }
        *
        * <br>
        *
        * # POST requests
        *
        * 1. [`phonebook/create`](#createpost)
        * 1. [`phonebook/delete_cticontact`](#delete_cticontactpost)
        * 1. [`phonebook/modify_cticontact`](#modify_cticontactpost)
        *
        * ---
        *
        * ### <a id="createpost">**`phonebook/create`**</a>
        *
        * Creates a contact in the NethCTI phonebook. The contact information must be
        * specified in the POST request in JSON format and must contain at least the
        * following parameters:
        *
        * * `type: ("speeddial | "private" | "public"): the visibility of the contact`
        * * `name: the name of the contact`
        * * `[homeemail]`
        * * `[workemail]`
        * * `[homephone]`
        * * `[workphone]`
        * * `[cellphone]`
        * * `[fax]`
        * * `[title]`
        * * `[company]`
        * * `[notes]`
        * * `[homestreet]`
        * * `[homepob]`
        * * `[homecity]`
        * * `[homeprovince]`
        * * `[homepostalcode]`
        * * `[homecountry]`
        * * `[workstreet]`
        * * `[workpob]`
        * * `[workcity]`
        * * `[workprovince]`
        * * `[workpostalcode]`
        * * `[workcountry]`
        * * `[url]`
        * * `[extension]`
        * * `[speeddial_num]`
        *
        * Example JSON request parameters:
        *
        *     { "creator": "alessandro", "type": "type", ... }
        *
        * ---
        *
        * ### <a id="delete_cticontactpost">**`phonebook/delete_cticontact`**</a>
        *
        * Deletes a contact from the NethCTI phonebook. The request must contains
        * the following parameter:
        *
        * * `id: the contact identifier in the NethCTI phonebook database`
        *
        * Example JSON request parameters:
        *
        *     { "id": "74" }
        *
        * The NethCTI phonebook is the _nethcti.cti\_phonebook_ database table.
        *
        * ---
        *
        * ### <a id="modify_cticontactpost">**`phonebook/modify_cticontact`**</a>
        *
        * Modify a contact in the NethCTI phonebook. The request must contains
        * the following parameters:
        *
        * * `id: the contact identifier in the NethCTI phonebook database`
        * * `[type]: ("speeddial | "private" | "public"): the visibility of the contact`
        * * `[name]: the name of the contact`
        * * `[homeemail]`
        * * `[workemail]`
        * * `[homephone]`
        * * `[workphone]`
        * * `[cellphone]`
        * * `[fax]`
        * * `[title]`
        * * `[company]`
        * * `[notes]`
        * * `[homestreet]`
        * * `[homepob]`
        * * `[homecity]`
        * * `[homeprovince]`
        * * `[homepostalcode]`
        * * `[homecountry]`
        * * `[workstreet]`
        * * `[workpob]`
        * * `[workcity]`
        * * `[workprovince]`
        * * `[workpostalcode]`
        * * `[workcountry]`
        * * `[url]`
        * * `[extension]`
        * * `[speeddial_num]`
        *
        * Example JSON request parameters:
        *
        *     { "creator": "alessandro", "type": "type", ... }
        *
        * The NethCTI phonebook is the _nethcti.cti\_phonebook_ database table.
        *
        * @class plugin_rest_phonebook
        * @static
        */
    var phonebook = {

      // the REST api
      api: {
        'root': 'phonebook',

        /**
         * REST API to be requested using HTTP GET request.
         *
         * @property get
         * @type {array}
         *
         *   @param {string} speeddials To get all the speeddial contacts of the user from the _NethCTI_ phonebook
         *   @param {string} search/:term[?view=company&limit=n&offset=n] To get the centralized and cti phonebook contacts that contains the term
         *   @param {string} contact/:id To get the the details of the contact that is in the centralized phonebook
         *   @param {string} cticontact/:id To get the the details of the contact that is in the cti phonebook
         *   @param {string} searchstartswith/:term[?view=company&limit=n&offset=n] To get the centralized and cti phonebook contacts whose name starts with the specified term
         *   @param {string} searchstartswith_digit/:view[?limit=n&offset=n] To get the centralized and cti phonebook contacts whose name starts with a digit
         */
        'get': [
          'speeddials',
          'search/:term',
          'contact/:id',
          'cticontact/:id',
          'searchstartswith/:term',
          'searchstartswith_digit/:view'
        ],

        /**
         * REST API to be requested using HTTP POST request.
         *
         * @property post
         * @type {array}
         *
         *   @param {string} create            Creates a contact in the NethCTI phonebook
         *   @param {string} delete_cticontact Deletes a contact from the NethCTI phonebook
         *   @param {string} modify_cticontact Modify a contact in the NethCTI phonebook
         */
        'post': [
          'create',
          'delete_cticontact',
          'modify_cticontact'
        ],
        'head': [],
        'del': []
      },

      /**
       * Returns all the speeddial contacts of the user. The contacts are in the _NethCTI_ phonebook.
       * It returns all database entries that have the field _type_ equal to "speeddial".
       *
       *     speeddials
       *
       * @method speeddials
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      speeddials: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          // use phonebook component
          compPhonebook.getPbSpeeddialContacts(username, function(err, results) {
            try {

              if (err) {
                throw err;
              } else {
                logger.info(IDLOG, 'send to user "' + username + '" all his #' + results.length + ' speeddial contacts');
                res.send(200, results);
              }

            } catch (err1) {
              logger.error(IDLOG, err1.stack);
              compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
          });

        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * It searches all phonebook contacts found in the _centralized_ and _NethCTI_ phonebooks.
       * Returns all database entries that contain the specified _term_ in the fields _name, company,
       * workphone, homephone_ and _cellphone_. It supports pagination with limit and offset. It offers
       * a view where results are grouped by company.
       *
       *     search/:term[?view=company&limit=n&offset=n]
       *
       * @method search
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      search: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          // use phonebook component
          compPhonebook.getPbContactsContains(
            req.params.term,
            username,
            req.params.view,
            req.params.offset,
            req.params.limit,
            function(err, results) {
              try {
                if (err) {
                  throw err;
                } else {
                  logger.info(IDLOG, 'send ' + results.count + ' (centralized + cti) phonebook contacts to user "' + username + '"');
                  res.send(200, results);
                }
              } catch (err1) {
                logger.error(IDLOG, err1.stack);
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
              }
            });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Returns the details of the contact that is in the cti phonebook. The parameter "id" is the database
       * identifier of the contact.
       *
       *     cticontact/:id
       *
       * @method search
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      cticontact: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          // use phonebook component
          compPhonebook.getCtiPbContact(req.params.id, function(err, result) {
            try {

              if (err) {
                throw err;
              } else {
                // check the authorization for the user. The user is authorized to view all his
                // contacts and only public contacts created by the other users. If no contact
                // has been found the "result" property is an empty object and it's returned to the user
                if (Object.keys(result).length === 0 || // the object is empty: no pb contact has been found
                  result.type === 'public' || result.owner_id === username) {

                  logger.info(IDLOG, 'send cti phonebook contact details of contact id "' + req.params.id + '" to user "' + username + '"');
                  res.send(200, result);

                } else {
                  logger.warn(IDLOG, 'user "' + username + '" has searched cti pb contact with id "' + req.params.id + '": the contact is not owned by him or is not a public contact');
                  compUtil.net.sendHttp403(IDLOG, res);
                }
              }

            } catch (err1) {
              logger.error(IDLOG, err1.stack);
              compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
          });

        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Returns the details of the contact that is in the centralized phonebook. The parameter "id" is the database
       * identifier of the contact.
       *
       *     contact/:id
       *
       * @method search
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      contact: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          // use phonebook component
          compPhonebook.getPbContact(req.params.id, function(err, result) {
            try {
              if (err) {
                throw err;
              } else {
                logger.info(IDLOG, 'send centralized phonebook contact details of contact id "' + req.params.id +
                  '" to user "' + username + '"');
                res.send(200, result);
              }
            } catch (err1) {
              logger.error(IDLOG, err1.stack);
              compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Searches all phonebook contacts found in the _centralized_ and _NethCTI_ phonebooks.
       * It returns all database entries whose _name_ and _company_ fields starts with the specified term.
       * It offers a view where results are grouped by company.
       *
       *     searchstartswith/:term[?view=company&limit=n&offset=n]
       *
       * @method searchstartswith
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      searchstartswith: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          // use phonebook component
          compPhonebook.getPbContactsStartsWith(
            req.params.term,
            username,
            req.params.view,
            req.params.offset,
            req.params.limit,
            function(err, results) {
              try {
                if (err) {
                  throw err;
                } else {
                  logger.info(IDLOG, 'send ' + results.count + ' (centralized + cti) phonebook contacts to user "' + username + '"');
                  res.send(200, results);
                }
              } catch (err1) {
                logger.error(IDLOG, err1.stack);
                compUtil.net.sendHttp500(IDLOG, res, err1.toString());
              }
            });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Searches all phonebook contacts found in the _centralized_ and _NethCTI_ phonebooks.
       * It returns all database entries whose _name_ and _company_ fields starts with a digit.
       * It offers a view where results are grouped by company.
       *
       *     searchstartswith_digit/view=[?limit=n&offset=n]
       *
       * @method searchstartswith_digit
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      searchstartswith_digit: function(req, res, next) {
        try {
          var username = req.headers.authorization_user;

          // use phonebook component
          compPhonebook.getPbContactsStartsWithDigit(
            username,
            req.params.view,
            req.params.offset,
            req.params.limit,
            function(err1, results) {
              try {
                if (err1) {
                  throw err1;
                } else {
                  logger.info(IDLOG, 'send ' + results.count + ' (centralized + cti) phonebook contacts to user "' + username + '"');
                  res.send(200, results);
                }
              } catch (err2) {
                logger.error(IDLOG, err2.stack);
                compUtil.net.sendHttp500(IDLOG, res, err2.toString());
              }
            });
        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Create a contact in the NethCTI phonebook with the following REST API:
       *
       *     create
       *
       * @method create
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      create: function(req, res, next) {
        try {
          var data = req.params;

          if (typeof data !== 'object' || typeof data.type !== 'string' || typeof data.name !== 'string' || (data.type !== 'private' && data.type !== 'public' && data.type !== 'speeddial')) {

            compUtil.net.sendHttp400(IDLOG, res);
            return;
          }

          // extract the username added in the authentication step
          var username = req.headers.authorization_user;

          // add the creator of the contact
          data.creator = username;

          // use phonebook component
          compPhonebook.saveCtiPbContact(data, function(err, results) {
            try {

              if (err) {
                throw err;
              } else {
                logger.info(IDLOG, 'cti phonebook contact has been created successful from the user "' + username + '"');
                compUtil.net.sendHttp201(IDLOG, res);
              }

            } catch (err1) {
              logger.error(IDLOG, err1.stack);
              compUtil.net.sendHttp500(IDLOG, res, err1.toString());
            }
          });

        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Deletes a contact from the NethCTI phonebook.
       *
       *     delete_cticontact
       *
       * @method delete_cticontact
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      delete_cticontact: function(req, res, next) {
        try {
          var data = req.params;

          if (typeof data !== 'object' || typeof data.id !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
          }

          // extract the username added in the authentication step
          var username = req.headers.authorization_user;

          compPhonebook.getCtiPbContact(data.id, function(err1, result) {
            try {
              if (err1) {
                throw err1;
              }

              // check the authorization for the user. He's authorized to delete only his
              // contacts. If no contact has been found the "result" property is an empty object
              if (Object.keys(result).length === 0 || // the object is empty: no pb contact has been found
                result.owner_id !== username) { // the contact isn't owned by the user

                logger.warn(IDLOG, 'deleting cti contact with db id "' + data.id + '" by the user "' + username + '": the contact is not owned by the user or isn\'t present');
                compUtil.net.sendHttp403(IDLOG, res);
                return;
              }

              // use phonebook component
              compPhonebook.deleteCtiPbContact(data.id, function(err3, results) {
                try {

                  if (err3) {
                    throw err3;
                  } else {
                    logger.info(IDLOG, 'cti phonebook contact with db id "' + data.id + '" has been successfully deleted by the user "' + username + '"');
                    compUtil.net.sendHttp200(IDLOG, res);
                  }

                } catch (err4) {
                  logger.error(IDLOG, err4.stack);
                  compUtil.net.sendHttp500(IDLOG, res, err4.toString());
                }
              });

            } catch (err2) {
              logger.error(IDLOG, err2.stack);
              compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
          });

        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      },

      /**
       * Modify a contact in the NethCTI phonebook.
       *
       *     modify_cticontact
       *
       * @method modify_cticontact
       * @param {object}   req  The client request
       * @param {object}   res  The client response
       * @param {function} next Function to run the next handler in the chain
       */
      modify_cticontact: function(req, res, next) {
        try {
          var data = req.params;

          if (typeof data !== 'object' || typeof data.id !== 'string') {
            compUtil.net.sendHttp400(IDLOG, res);
            return;
          }

          // extract the username added in the authentication step
          var username = req.headers.authorization_user;

          compPhonebook.getCtiPbContact(data.id, function(err1, result) {
            try {
              if (err1) {
                throw err1;
              }

              // check the authorization for the user. He's authorized to modify only his
              // contacts. If no contact has been found the "result" property is an empty object
              if (Object.keys(result).length === 0 || // the object is empty: no pb contact has been found
                result.owner_id !== username) { // the contact isn't owned by the user

                logger.warn(IDLOG, 'modify cti contact with db id "' + data.id + '" by the user "' + username + '": the contact is not owned by the user or it isn\'t present');
                compUtil.net.sendHttp403(IDLOG, res);
                return;
              }

              // use phonebook component
              compPhonebook.modifyCtiPbContact(data, function(err3, results) {
                try {
                  if (err3) {
                    throw err3;
                  } else {
                    logger.info(IDLOG, 'cti phonebook contact with db id "' + data.id + '" has been successfully modified by the user "' + username + '"');
                    compUtil.net.sendHttp200(IDLOG, res);
                  }

                } catch (err4) {
                  logger.error(IDLOG, err4.stack);
                  compUtil.net.sendHttp500(IDLOG, res, err4.toString());
                }
              });

            } catch (err2) {
              logger.error(IDLOG, err2.stack);
              compUtil.net.sendHttp500(IDLOG, res, err2.toString());
            }
          });

        } catch (err) {
          logger.error(IDLOG, err.stack);
          compUtil.net.sendHttp500(IDLOG, res, err.toString());
        }
      }
    };
    exports.api = phonebook.api;
    exports.search = phonebook.search;
    exports.create = phonebook.create;
    exports.setLogger = setLogger;
    exports.speeddials = phonebook.speeddials;
    exports.contact = phonebook.contact;
    exports.cticontact = phonebook.cticontact;
    exports.setCompUtil = setCompUtil;
    exports.searchstartswith = phonebook.searchstartswith;
    exports.setCompPhonebook = setCompPhonebook;
    exports.delete_cticontact = phonebook.delete_cticontact;
    exports.modify_cticontact = phonebook.modify_cticontact;
    exports.searchstartswith_digit = phonebook.searchstartswith_digit;

  } catch (err) {
    logger.error(IDLOG, err.stack);
  }
})();
