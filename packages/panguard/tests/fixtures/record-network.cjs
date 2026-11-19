// Preloaded with `node --require`: records every outbound network attempt to the
// file named by NET_LOG and refuses it, so a test can count requests without a server.
const fs = require('node:fs');

const log = process.env.NET_LOG;
const record = (kind, target) => fs.appendFileSync(log, `${kind} ${target}\n`);
const describeTarget = (arg) => {
  if (typeof arg === 'string') return arg;
  if (arg && typeof arg === 'object') return arg.href || `${arg.hostname || arg.host || ''}${arg.path || ''}`;
  return String(arg);
};

for (const name of ['http', 'https']) {
  const mod = require(`node:${name}`);
  for (const fn of ['request', 'get']) {
    mod[fn] = (...args) => {
      record(name, describeTarget(args[0]));
      throw new Error('network blocked in test');
    };
  }
}
for (const name of ['net', 'tls']) {
  const mod = require(`node:${name}`);
  mod.connect = (...args) => {
    record(name, describeTarget(args[0]));
    throw new Error('network blocked in test');
  };
}
globalThis.fetch = async (input) => {
  record('fetch', describeTarget(input && input.url ? input.url : input));
  throw new Error('network blocked in test');
};
