/** @file 现有代理地址格式的解析与序列化。 */

export function parseProxyUrl(u) {
  const r = { proto: 'http', host: '', port: '', user: '', pass: '' };
  if (!u) return r;
  let rest = u;
  const m = u.match(/^([a-zA-Z0-9]+):\/\//);
  if (m) {
    r.proto = m[1].toLowerCase();
    rest = u.slice(m[0].length);
  }
  const at = rest.lastIndexOf('@');
  if (at >= 0) {
    const cred = rest.slice(0, at);
    rest = rest.slice(at + 1);
    const ci = cred.indexOf(':');
    if (ci >= 0) {
      r.user = cred.slice(0, ci);
      r.pass = cred.slice(ci + 1);
    } else r.user = cred;
  }
  if (rest[0] === '[') {
    const close = rest.indexOf(']');
    r.host = rest.slice(1, close);
    const after = rest.slice(close + 1);
    if (after[0] === ':') r.port = after.slice(1);
  } else {
    const colon = rest.lastIndexOf(':');
    if (colon >= 0) {
      r.host = rest.slice(0, colon);
      r.port = rest.slice(colon + 1);
    } else r.host = rest;
  }
  return r;
}

export function buildProxyUrl(obj) {
  const proto = obj.protocol || 'http';
  const host = obj.host || '';
  const is6 = host && host.indexOf(':') >= 0 && host[0] !== '[';
  let hp = is6 ? '[' + host + ']' : host;
  if (obj.port) hp += ':' + obj.port;
  let cred = '';
  if (obj.user) cred = obj.user + (obj.pass ? ':' + obj.pass : '') + '@';
  return proto + '://' + cred + hp;
}

export function normalizeBatchLine(line) {
  const u = line.indexOf('://') >= 0 ? line : 'http://' + line;

  if (!/^[a-zA-Z0-9]+:\/\/[^/\s]+/.test(u)) return '';
  return u;
}
