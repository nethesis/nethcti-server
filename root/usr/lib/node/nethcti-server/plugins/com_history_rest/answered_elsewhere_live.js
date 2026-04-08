var fs = require('fs');
var net = require('net');

var amiConfigCache;

function loadAmiConfig() {
  if (amiConfigCache) {
    return amiConfigCache;
  }

  amiConfigCache = JSON.parse(fs.readFileSync('/etc/nethcti/asterisk.json', 'utf8'));
  return amiConfigCache;
}

function parseAmiMessage(message) {
  var parsed = {};

  message.split(/\r\n/).forEach(function (line) {
    var separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      return;
    }

    var key = line.substring(0, separatorIndex).trim().toLowerCase();
    var value = line.substring(separatorIndex + 1).trim();
    parsed[key] = value;
  });

  return parsed;
}

function getActiveLinkedids(cb) {
  try {
    var amiConfig = loadAmiConfig();
    var socket = net.createConnection({
      host: amiConfig.host || 'localhost',
      port: parseInt(amiConfig.port, 10) || 5038
    });
    var actionId = 'answered-elsewhere-' + Date.now();
    var buffer = '';
    var loggedIn = false;
    var completed = false;
    var activeLinkedids = {};
    var timeout = setTimeout(function () {
      cleanup(new Error('AMI CoreShowChannels timeout'));
    }, 5000);

    function finish(err) {
      if (completed) {
        return;
      }

      completed = true;
      clearTimeout(timeout);

      if (socket && !socket.destroyed) {
        socket.end();
      }

      cb(err, activeLinkedids);
    }

    function cleanup(err) {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }

      finish(err);
    }

    socket.on('connect', function () {
      socket.write(
        'Action: Login\r\n' +
        'Username: ' + amiConfig.user + '\r\n' +
        'Secret: ' + amiConfig.pass + '\r\n' +
        'Events: off\r\n\r\n'
      );
    });

    socket.on('data', function (chunk) {
      buffer += chunk.toString();

      while (buffer.indexOf('\r\n\r\n') !== -1) {
        var separatorIndex = buffer.indexOf('\r\n\r\n');
        var rawMessage = buffer.substring(0, separatorIndex);
        buffer = buffer.substring(separatorIndex + 4);

        if (!rawMessage.trim()) {
          continue;
        }

        var message = parseAmiMessage(rawMessage);

        if (!loggedIn) {
          if (message.response === 'Success') {
            loggedIn = true;
            socket.write(
              'Action: CoreShowChannels\r\n' +
              'ActionID: ' + actionId + '\r\n\r\n'
            );
          } else if (message.response === 'Error') {
            cleanup(new Error('AMI login failed: ' + (message.message || 'unknown error')));
          }
          continue;
        }

        if (message.actionid && message.actionid !== actionId) {
          continue;
        }

        if (message.event === 'CoreShowChannel' && message.linkedid) {
          activeLinkedids[message.linkedid] = true;
        } else if (message.event === 'CoreShowChannelsComplete') {
          socket.write('Action: Logoff\r\n\r\n');
          finish(null);
        } else if (message.response === 'Error') {
          cleanup(new Error('AMI CoreShowChannels failed: ' + (message.message || 'unknown error')));
        }
      }
    });

    socket.on('error', function (err) {
      cleanup(err);
    });

    socket.on('end', function () {
      finish(null);
    });

  } catch (err) {
    cb(err);
  }
}

function isAnsweredElsewhereCandidate(row) {
  return row &&
    row.linkedid &&
    (
      row.queue ||
      (typeof row.channel === 'string' && row.channel.indexOf('@from-queue-') !== -1) ||
      row.lastapp === 'Queue'
    ) &&
    ['NO ANSWER', 'BUSY', 'FAILED'].indexOf(row.disposition) !== -1;
}

function promoteAnsweredElsewhereRows(results, logger, idLog, cb) {
  try {
    if (!results || !Array.isArray(results.rows) || results.rows.length === 0) {
      cb(null, results);
      return;
    }

    var plainRows = results.rows.map(function (row) {
      if (row && typeof row.get === 'function') {
        return row.get({ plain: true });
      }
      if (row && row.dataValues) {
        return row.dataValues;
      }
      return row;
    });

    var candidateRows = plainRows.filter(isAnsweredElsewhereCandidate);
    if (candidateRows.length === 0) {
      cb(null, results);
      return;
    }

    getActiveLinkedids(function (err, activeLinkedids) {
      if (err) {
        logger.log.warn(idLog, 'failed to fetch active linkedids from AMI: ' + err.message);
        cb(null, results);
        return;
      }

      plainRows.forEach(function (row) {
        if (activeLinkedids[row.linkedid] && isAnsweredElsewhereCandidate(row)) {
          row.disposition = 'ANSWERED_ELSEWHERE';
          row.normalized_disposition = 'ANSWERED_ELSEWHERE';
        }
      });

      results.rows = plainRows;
      cb(null, results);
    });
  } catch (err) {
    cb(err);
  }
}

exports.promoteAnsweredElsewhereRows = promoteAnsweredElsewhereRows;
