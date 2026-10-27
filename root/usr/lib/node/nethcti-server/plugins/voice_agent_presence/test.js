'use strict';
const assert = require('assert');
const http = require('http');
const api = require('./index');
const token = 'synthetic_service_token_01234567890123456789';
const fs = require('fs');
const os = require('os');
const path = require('path');
const auth = require('../authorization/authorization');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'recipient-permissions-'));
auth.setLogger({log: {info: () => {}, warn: () => {}, error: () => {}}});
try {
  const files = {users: path.join(directory,'users.json'), profiles: path.join(directory,'profiles.json'), nethcti: path.join(directory,'cti.json')};
  fs.writeFileSync(files.users, JSON.stringify({alice: {profile_id:'p'}}));
  fs.writeFileSync(files.nethcti, JSON.stringify({hostname:'voice.example.org'}));
  for (const parent of [true,false]) for (const permission of [true,false]) {
    fs.writeFileSync(files.profiles,JSON.stringify({p:{macro_permissions:{nethvoice_cti:{value:parent,permissions:[{id:'chat',name:'chat',value:permission}]}}}}));
    auth.config(files);
    assert.strictEqual(auth.canReceiveConsultationChat('alice'),parent && permission);
    assert.strictEqual(auth.canReceiveConsultationChat('removed'),false);
  }
} finally { for (const file of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory,file)); fs.rmdirSync(directory); }
let all = {alice: {mainextension: {'203': {}}, extension: {'91203': {password: 'PRIVATE'}}}};
let presence = 'dnd', allowed = true, native = 'online', ready = true, requests = 0;
const imports = {
  user: {
    isConfigured: () => ready,
    getAllUsersEndpointsJSON: () => all,
    getUserInfoJSON: name => ({username: name, mainPresence: presence, private: 'PRIVATE'})
  },
  authorization: {canReceiveConsultationChat: () => allowed},
  astProxy: {getExtenStatus: () => native, doCmd: (args, cb) => { requests++; assert.strictEqual(args.command, 'dndGet'); cb(null, {exten: args.exten, dnd: 'off'}); }}
};
async function main() {
  const server = http.createServer(api.handler(imports, token));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  async function get(path, auth = token, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = http.request({host: '127.0.0.1', port: server.address().port, path, method,
        headers: {Authorization: 'Bearer ' + auth}}, res => {
        let body = '';
        res.on('data', b => { body += b; });
        res.on('end', () => resolve({status: res.statusCode, body: JSON.parse(body)}));
      });
      req.on('error', reject); req.end();
    });
  }
  try {
    assert.strictEqual((await get('/v1/recipients/203', 'wrong')).status, 401);
    for (const path of ['/v1/recipients/91203', '/v1/recipients/alice', '/v1/recipients/203?all=1', '/user/endpoints/all']) {
      assert.strictEqual((await get(path)).status, 404);
    }
    assert.strictEqual((await get('/v1/recipients/203', token, 'POST')).status, 404);
    assert.strictEqual(requests, 0);
    for (const status of ['online', 'dnd', 'busy', 'ringing', 'offline', 'voicemail', 'cellphone', 'callforward']) {
      presence = status;
      const result = await get('/v1/recipients/203');
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body.effective_presence, status);
      assert.strictEqual(result.body.chat_allowed, true);
      assert.strictEqual(result.body.recipient_id, 'alice');
      assert.strictEqual(result.body.mainextension, '203');
      assert.strictEqual(result.body.version, 1);
      assert(Math.abs(Date.now() - Date.parse(result.body.observed_at)) < 1000);
      assert(!JSON.stringify(result).includes('PRIVATE'));
      assert.deepStrictEqual(Object.keys(result.body).sort(), ['version', 'observed_at', 'device_state', 'recipient_id', 'mainextension', 'effective_presence', 'chat_allowed'].sort());
    }
    allowed = false;
    assert.strictEqual((await get('/v1/recipients/203')).body.chat_allowed, false);
    all.bob = {mainextension: {'203': {}}};
    assert.strictEqual((await get('/v1/recipients/203')).status, 404);
    delete all.bob;
    all.alice.mainextension['204'] = {};
    assert.strictEqual((await get('/v1/recipients/203')).status, 404);
    delete all.alice.mainextension['204'];
    ready = false;
    assert.strictEqual((await get('/v1/recipients/203')).status, 503);
    ready = true;
    imports.astProxy.doCmd = (args, cb) => cb(new Error('PRIVATE'));
    assert.deepStrictEqual((await get('/v1/recipients/203')).body, {error: 'native_state_unavailable'});
    imports.astProxy.doCmd = () => {};
    assert.strictEqual((await get('/v1/recipients/203')).status, 503);
    console.log('Recipient service: authentication, main-extension identity, native freshness, presence and secret projection passed');
  } finally { await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
