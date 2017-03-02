#!/usr/bin/env node

/**
 * Main application that starts all architect modules.
 */
var fs = require('fs');
var path = require('path');
var architect = require('architect');
var PLUGINS_DIRNAME = 'plugins';

/**
 * The module identifier used by the logger.
 *
 * @property IDLOG
 * @type string
 * @private
 * @final
 * @readOnly
 * @default [arch_http_proxy]
 */
var IDLOG = '[nethcti]';

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
 * The application.
 *
 * @property app
 * @type object
 * @private
 */
var app;

try {
  fs.readdir(PLUGINS_DIRNAME, function(err, files) {
    try {
      if (err) {
        logger.error(IDLOG, err.stack);
        process.exit(1);
      }

      var i;
      var modules = [];
      for (i = 0; i < files.length; i++) {
        modules.push(path.join(process.cwd(), PLUGINS_DIRNAME, files[i]));
      }

      architect.resolveConfig(modules, __dirname, function(err, config) {
        try {
          if (err) {
            logger.error(IDLOG, err.stack);
            process.exit(1);
          }

          app = architect.createApp(config, function(err1, app) {
            if (err1) {
              logger.error(IDLOG, err1.stack);
              process.exit(1);
            }
          });

          app.on('service', function(name, service) {
            if (name === 'logger') {
              logger = service;
            }
          });
          app.on('ready', function(uno, due) {
            logger.warn(IDLOG, 'STARTED ' + process.argv[1]);
          });
        } catch (err) {
          logger.error(IDLOG, err.stack);
        }
      });

      process.on('uncaughtException', function(err) {
        logger.error(IDLOG, 'UncaughtException !!!');
        logger.error(IDLOG, err.stack);
      });

      process.on('SIGTERM', function() {
        logger.warn(IDLOG, 'process halted by SIGTERM');
        process.exit(2);
      });

      process.on('SIGINT', function() {
        logger.warn(IDLOG, 'process halted by SIGINT (Ctrl+C)');
        process.exit(2);
      });

      process.on('exit', function(code) {
        logger.warn(IDLOG, 'exit with code: ' + code);
      });
    } catch (err) {
      logger.error(IDLOG, err.stack);
    }
  });
} catch (err) {
  logger.error(IDLOG, err.stack);
}
