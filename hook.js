/* TizenTube-GV v3: rewrites *.googlevideo.com -> *.c.youtube.com (same Google video servers, valid *.c.youtube.com cert).
   With the home DNS, *.youtube.com goes through the home SNI router, so video bypasses the ISP block.
   Rewrites stream URLs inside API responses (JSON.parse / Response.text / Response.json / XHR) and hooks fetch/XHR/media src.
   Stock TizenTube 1.15.2 follows below. */
(function () {
  if (window.__ttgvHooked) return;
  window.__ttgvHooked = true;
  var RE_ANY = /\.googlevideo\.com/gi;
  var RE_URL = /^((?:https?:)?\/\/[a-z0-9.-]*?)\.googlevideo\.com(?=[\/:?#]|$)/i;
  function rwText(t) {
    if (typeof t !== 'string' || t.indexOf('googlevideo.com') === -1) return t;
    return t.replace(RE_ANY, '.c.youtube.com');
  }
  function rw(u) {
    try {
      if (typeof u === 'string') return u.replace(RE_URL, '$1.c.youtube.com');
      if (typeof URL !== 'undefined' && u instanceof URL) return rw(String(u));
    } catch (e) {}
    return u;
  }
  window.__ttgv = { rw: rw, rwText: rwText, hits: 0, v: 3 };
  var op = JSON.parse;
  JSON.parse = function (text, reviver) {
    if (typeof text === 'string' && text.indexOf('googlevideo.com') !== -1) {
      text = rwText(text);
      window.__ttgv.hits++;
    }
    return op.call(this, text, reviver);
  };
  try {
    var ot = Response.prototype.text;
    Response.prototype.text = function () { return ot.call(this).then(rwText); };
    Response.prototype.json = function () { return ot.call(this).then(function (t) { return JSON.parse(t); }); };
  } catch (e) {}
  try {
    var d = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    if (d && d.get) {
      Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        get: function () { return rwText(d.get.call(this)); },
        configurable: true
      });
    }
  } catch (e) {}
  var of = window.fetch;
  if (of) {
    window.fetch = function (input, init) {
      try {
        if (typeof Request !== 'undefined' && input instanceof Request) {
          var nu = rw(input.url);
          if (nu !== input.url) input = new Request(nu, input);
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
  try { (new Image()).src = 'https://redirector.c.youtube.com/generate_204?ttgv=3&t=' + Date.now(); } catch (e) {}
})();
