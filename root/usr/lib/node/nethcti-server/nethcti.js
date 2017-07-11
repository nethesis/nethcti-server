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
 * @default {
  ctilog: {
    log: console
  }
}
 */
var logger = {
  ctilog: {
    log: console
  }
};

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
        logger.ctilog.log.error(IDLOG, err.stack);
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
            logger.ctilog.log.error(IDLOG, err.stack);
            process.exit(1);
          }

          app = architect.createApp(config, function(err1, app) {
            if (err1) {
              logger.ctilog.log.error(IDLOG, err1.stack);
              process.exit(1);
            }
          });

          app.on('service', function(name, service) {
            if (name === 'logger') {
              logger = service;
            }
          });

          app.on('ready', function(uno, due) {
            logger.ctilog.log.warn(IDLOG, 'STARTED ' + process.argv[1]);
          });
        } catch (err) {
          logger.ctilog.log.error(IDLOG, err.stack);
        }
      });

      process.on('uncaughtException', function(err) {
        logger.ctilog.log.error(IDLOG, 'UncaughtException !!!');
        logger.ctilog.log.error(IDLOG, err.stack);
        app.destroy();
      });

      process.on('SIGUSR1', function() {
        logger.ctilog.log.warn(IDLOG, 'received signal SIGUSR1: RELOAD all components');
        for (var comp in app.services) {
          if (typeof app.services[comp].reload === 'function') {
            app.services[comp].reload();
          }
        }
      });

      process.on('SIGTERM', function() {
        app.destroy();
        logger.ctilog.log.warn(IDLOG, 'process HALTED by SIGTERM');
        process.exit(2);
      });

      process.on('SIGINT', function() {
        app.destroy();
        logger.ctilog.log.warn(IDLOG, 'process HALTED by SIGINT (Ctrl+C)');
        process.exit(2);
      });

      process.on('exit', function(code) {
        app.destroy();
        logger.ctilog.log.warn(IDLOG, 'exit with code: ' + code);
      });
    } catch (err) {
      logger.ctilog.log.error(IDLOG, err.stack);
    }
  });
} catch (err) {
  logger.ctilog.log.error(IDLOG, err.stack);
}
