'use strict';
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

function recipient(user, authorization, extension) {
  if (!user.isConfigured()) throw new Error('not_ready');
  const all = user.getAllUsersEndpointsJSON();
  const matches = Object.keys(all).filter(name =>
    Object.prototype.hasOwnProperty.call(all[name].mainextension || {}, extension));
  if (matches.length !== 1 || Object.keys(all[matches[0]].mainextension).length !== 1) return null;
  const username = matches[0];
  const info = user.getUserInfoJSON(username);
  if (!info || info.username !== username) return null;
  return {recipient_id: username, mainextension: extension,
    effective_presence: info.mainPresence || 'unknown',
    chat_allowed: authorization.canReceiveConsultationChat(username) === true};
}

function handler(imports, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) throw new Error('invalid_service_token');
  let pending = 0;
  return function(req, res) {
    const send = (status, value) => {
      res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
      res.end(JSON.stringify(value));
    };
    const supplied = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from('Bearer ' + token);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return send(401, {error: 'unauthorized'});
    const match = /^\/v1\/recipients\/([0-9]{1,20})$/.exec(req.url);
    if (req.method !== 'GET' || !match || req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) !== 0) return send(404, {error: 'not_found'});
    if (pending >= 16) return send(503, {error: 'busy'});
    let value;
    try { value = recipient(imports.user, imports.authorization, match[1]); }
    catch (err) { return send(503, {error: 'not_ready'}); }
    if (!value) return send(404, {error: 'recipient_unavailable'});
    // Timed-out native callbacks retain their slot until answered, bounding
    // the underlying AMI callback map during a disconnected backend.
    pending++;
    let done = false;
    const finish = (status, result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!res.destroyed) send(status, result);
    };
    const timer = setTimeout(() => finish(503, {error: 'native_state_unavailable'}), 1500);
    // A response on the existing ordered AMI connection proves that current
    // presence events have been processed, without a human CTI session.
    try {
      imports.astProxy.doCmd({command: 'dndGet', exten: match[1]}, (err, state) => {
        pending--;
        if (done) return;
        if (err || !state || state.exten !== match[1] || !['on','off'].includes(state.dnd)) return finish(503, {error: 'native_state_unavailable'});
        let current;
        try { current = recipient(imports.user, imports.authorization, match[1]); }
        catch (error) { return finish(503, {error: 'not_ready'}); }
        if (!current || current.recipient_id !== value.recipient_id) return finish(404, {error: 'recipient_unavailable'});
        const device = state.dnd === 'on' ? 'dnd' : imports.astProxy.getExtenStatus(match[1]);
        finish(200, Object.assign({version: 1, observed_at: new Date().toISOString(), device_state: typeof device === 'string' ? device : 'unknown'}, current));
      });
    } catch (err) { pending--; finish(503, {error: 'native_state_unavailable'}); }
  };
}

module.exports = function(options, imports, register) {
  register();
  const port = process.env.NETHVOICE_RECIPIENT_SERVICE_PORT;
  if (!port) return; // Disabled unless the module provisions this private service.
  try {
    if (!/^[0-9]+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error('invalid_port');
    const token = fs.readFileSync(process.env.NETHVOICE_RECIPIENT_SERVICE_TOKEN_FILE, 'utf8').trim();
    const server = http.createServer(handler(imports, token));
    server.headersTimeout = 3000;
    server.requestTimeout = 3000;
    server.maxHeadersCount = 16;
    server.on('error', () => imports.logger.ctilog.log.error('[voice_agent_presence]', 'private recipient service failed'));
    server.listen(Number(port), '127.0.0.1');
    process.once('SIGTERM', () => server.close());
    process.once('SIGINT', () => server.close());
  } catch (err) {
    imports.logger.ctilog.log.error('[voice_agent_presence]', 'private recipient service configuration invalid');
  }
};
module.exports.handler = handler;
module.exports.recipient = recipient;
