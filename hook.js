/* TizenTube-GV v2: routes googlevideo.com video traffic through the home proxy (gv.87.232.123.112.nip.io).
   Rewrites stream URLs inside YouTube API responses (JSON.parse / Response.json / Response.text) and also hooks fetch/XHR.
   Stock TizenTube 1.15.2 follows below. */
(function () {
  if (window.__ttgvHooked) return;
  window.__ttgvHooked = true;
  var HOST = 'gv.87.232.123.112.nip.io';
  var PROXY = 'https://' + HOST + '/';
  var RE_URL = /^(?:https?:)?\/\/([a-z0-9-]+)\.googlevideo\.com\//i;
  // plain:   https://rr1---sn-x.googlevideo.com/
  var RE_PLAIN = /https?:\/\/([a-z0-9-]+)\.googlevideo\.com\//gi;
  // json-escaped: https:\/\/rr1---sn-x.googlevideo.com\/
  var RE_ESC = /https?:\\\/\\\/([a-z0-9-]+)\.googlevideo\.com\\\//gi;
  // url-encoded: https%3A%2F%2Frr1---sn-x.googlevideo.com%2F
  var RE_ENC = /https?%3A%2F%2F([a-z0-9-]+)\.googlevideo\.com%2F/gi;
  var ENC_PROXY = encodeURIComponent(PROXY);
  var ESC_PROXY = PROXY.replace(/\//g, '\\/');
  function rwText(t) {
    if (typeof t !== 'string' || t.indexOf('googlevideo.com') === -1) return t;
    return t.replace(RE_PLAIN, function (m, h) { return PROXY + h + '/'; })
            .replace(RE_ESC, function (m, h) { return ESC_PROXY + h + '\\/'; })
            .replace(RE_ENC, function (m, h) { return ENC_PROXY + h + '%2F'; });
  }
  function rw(u) {
    try {
      if (typeof u === 'string') return u.replace(RE_URL, function (m, h) { return PROXY + h + '/'; });
      if (typeof URL !== 'undefined' && u instanceof URL) return rw(String(u));
    } catch (e) {}
    return u;
  }
  window.__ttgv = { rw: rw, rwText: rwText, hits: 0 };
  // 1) JSON.parse (YouTube TV parses innertube player responses with it)
  var op = JSON.parse;
  JSON.parse = function (text, reviver) {
    if (typeof text === 'string' && text.indexOf('googlevideo.com') !== -1) {
      text = rwText(text);
      window.__ttgv.hits++;
    }
    return op.call(this, text, reviver);
  };
  // 2) Response.text / Response.json
  try {
    var ot = Response.prototype.text;
    Response.prototype.text = function () {
      return ot.call(this).then(rwText);
    };
    Response.prototype.json = function () {
      return ot.call(this).then(function (t) { return JSON.parse(t); });
    };
  } catch (e) {}
  // 3) XHR responseText for JSON responses
  try {
    var d = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    if (d && d.get) {
      Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        get: function () { return rwText(d.get.call(this)); },
        configurable: true
      });
    }
  } catch (e) {}
  // 4) direct request hooks (in case the player uses our patched globals)
  var of = window.fetch;
  if (of) {
    window.fetch = function (input, init) {
      try {
        if (typeof Request !== 'undefined' && input instanceof Request && RE_URL.test(input.url)) {
          input = new Request(rw(input.url), input);
        } else {
          input = rw(input);
        }
      } catch (e) {}
      return of.call(this, input, init);
    };
  }
  var oo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = rw(url);
    return oo.apply(this, args);
  };
  try {
    var ds = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (ds && ds.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        get: ds.get,
        set: function (v) { ds.set.call(this, rw(v)); },
        configurable: true
      });
    }
  } catch (e) {}
  // beacon so the server log shows the hook is alive
  try { (new Image()).src = PROXY + 'ttgv-alive/ping?v=2&t=' + Date.now(); } catch (e) {}
})();
