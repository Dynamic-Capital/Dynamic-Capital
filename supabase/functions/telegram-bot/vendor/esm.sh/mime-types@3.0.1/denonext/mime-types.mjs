/* esm.sh - mime-types@3.0.1 */
import * as __0$ from "/mime-db@^1.54.0?target=denonext";
import * as __1$ from "node:path";
var require = (n) => {
  const e = (m) => typeof m.default < "u" ? m.default : m,
    c = (m) => Object.assign({ __esModule: true }, m);
  switch (n) {
    case "mime-db":
      return e(__0$);
    case "node:path":
      return e(__1$);
    default:
      console.error('module "' + n + '" not found');
      return null;
  }
};
var k = Object.create;
var v = Object.defineProperty;
var b = Object.getOwnPropertyDescriptor;
var j = Object.getOwnPropertyNames;
var L = Object.getPrototypeOf, P = Object.prototype.hasOwnProperty;
var p =
  ((r) =>
    typeof require < "u"
      ? require
      : typeof Proxy < "u"
      ? new Proxy(r, { get: (e, t) => (typeof require < "u" ? require : e)[t] })
      : r)(function (r) {
      if (typeof require < "u") return require.apply(this, arguments);
      throw Error('Dynamic require of "' + r + '" is not supported');
    });
var d = (r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports);
var w = (r, e, t, o) => {
  if (e && typeof e == "object" || typeof e == "function") {
    for (let a of j(e)) {
      !P.call(r, a) && a !== t && v(r, a, {
        get: () => e[a],
        enumerable: !(o = b(e, a)) || o.enumerable,
      });
    }
  }
  return r;
};
var X = (
  r,
  e,
  t,
) => (t = r != null ? k(L(r)) : {},
  w(
    e || !r || !r.__esModule
      ? v(t, "default", { value: r, enumerable: !0 })
      : t,
    r,
  ));
var S = d((K, C) => {
  var h = { "prs.": 100, "x-": 200, "x.": 300, "vnd.": 400, default: 900 },
    m = { nginx: 10, apache: 20, iana: 40, default: 30 },
    E = { application: 1, font: 2, default: 0 };
  C.exports = function (e, t = "default") {
    if (e === "application/octet-stream") return 0;
    let [o, a] = e.split("/"),
      s = a.replace(/(\.|x-).*/, "$1"),
      f = h[s] || h.default,
      c = m[t] || m.default,
      u = E[o] || E.default,
      R = 1 - e.length / 100;
    return f + c + u + R;
  };
});
var O = d((n) => {
  "use strict";
  var i = p("mime-db"),
    q = p("node:path").extname,
    T = S(),
    g = /^\s*([^;\s]*)(?:;|\s|$)/,
    A = /^text\//i;
  n.charset = _;
  n.charsets = { lookup: _ };
  n.contentType = U;
  n.extension = x;
  n.extensions = Object.create(null);
  n.lookup = Y;
  n.types = Object.create(null);
  n._extensionConflicts = [];
  F(n.extensions, n.types);
  function _(r) {
    if (!r || typeof r != "string") return !1;
    var e = g.exec(r), t = e && i[e[1].toLowerCase()];
    return t && t.charset ? t.charset : e && A.test(e[1]) ? "UTF-8" : !1;
  }
  function U(r) {
    if (!r || typeof r != "string") return !1;
    var e = r.indexOf("/") === -1 ? n.lookup(r) : r;
    if (!e) return !1;
    if (e.indexOf("charset") === -1) {
      var t = n.charset(e);
      t && (e += "; charset=" + t.toLowerCase());
    }
    return e;
  }
  function x(r) {
    if (!r || typeof r != "string") return !1;
    var e = g.exec(r), t = e && n.extensions[e[1].toLowerCase()];
    return !t || !t.length ? !1 : t[0];
  }
  function Y(r) {
    if (!r || typeof r != "string") return !1;
    var e = q("x." + r).toLowerCase().slice(1);
    return e && n.types[e] || !1;
  }
  function F(r, e) {
    Object.keys(i).forEach(function (o) {
      var a = i[o], s = a.extensions;
      if (!(!s || !s.length)) {
        r[o] = s;
        for (var f = 0; f < s.length; f++) {
          var c = s[f];
          e[c] = G(c, e[c], o);
          let u = M(c, e[c], o);
          u !== e[c] && n._extensionConflicts.push([c, u, e[c]]);
        }
      }
    });
  }
  function G(r, e, t) {
    var o = e ? T(e, i[e].source) : 0, a = t ? T(t, i[t].source) : 0;
    return o > a ? e : t;
  }
  function M(r, e, t) {
    var o = ["nginx", "apache", void 0, "iana"],
      a = e ? o.indexOf(i[e].source) : 0,
      s = t ? o.indexOf(i[t].source) : 0;
    return n.types[x] !== "application/octet-stream" &&
          (a > s || a === s && n.types[x]?.slice(0, 12) === "application/") ||
        a > s
      ? e
      : t;
  }
});
var l = X(O()),
  {
    charset: z,
    charsets: B,
    contentType: D,
    extension: H,
    extensions: I,
    lookup: J,
    types: Q,
    _extensionConflicts: V,
  } = l,
  W = l.default ?? l;
export {
  B as charsets,
  D as contentType,
  H as extension,
  I as extensions,
  J as lookup,
  Q as types,
  V as _extensionConflicts,
  W as default,
  z as charset,
};
/*! Bundled license information:

mime-types/index.js:
  (*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
//# sourceMappingURL=mime-types.mjs.map
