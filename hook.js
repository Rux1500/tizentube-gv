/* TizenTube-GV: routes googlevideo.com video traffic through the home proxy (gv.87.232.123.112.nip.io). Then loads stock TizenTube 1.15.2 below. */
(function () {
  if (window.__ttgvHooked) return;
  window.__ttgvHooked = true;
  var PROXY = 'https://gv.87.232.123.112.nip.io/';
  var RE = /^(?:https?:)?\/\/([a-z0-9-]+)\.googlevideo\.com\//i;
  function rw(u) {
    try {
      if (typeof u === 'string') {
        return u.replace(RE, function (m, h) { return PROXY + h + '/'; });
      }
      if (typeof URL !== 'undefined' && u instanceof URL) {
        return rw(String(u));
      }
    } catch (e) {}
    return u;
  }
  window.__ttgvRewrite = rw;
  var of = window.fetch;
  if (of) {
    window.fetch = function (input, init) {
      try {
        if (typeof Request !== 'undefined' && input instanceof Request && RE.test(input.url)) {
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
    var d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (d && d.set) {
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        get: d.get,
        set: function (v) { d.set.call(this, rw(v)); },
        configurable: true
      });
    }
  } catch (e) {}
  try {
    if (navigator.sendBeacon) {
      var sb = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (u, d) { return sb(rw(u), d); };
    }
  } catch (e) {}
})();
