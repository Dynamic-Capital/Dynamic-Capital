// deno-lint-ignore-file prefer-const require-await
if (!self.define) {
  let e, s = {};
  const c = (
    c,
    a,
  ) => (c = new URL(c + ".js", a).href,
    s[c] || new Promise((s) => {
      if ("document" in self) {
        const e = document.createElement("script");
        e.src = c, e.onload = s, document.head.appendChild(e);
      } else e = c, importScripts(c), s();
    }).then(() => {
      let e = s[c];
      if (!e) throw new Error(`Module ${c} didn’t register its module`);
      return e;
    }));
  self.define = (a, i) => {
    const t = e || ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (s[t]) return;
    let n = {};
    const r = (e) => c(e, t),
      f = { module: { uri: t }, exports: n, require: r };
    s[t] = Promise.all(a.map((e) => f[e] || r(e))).then((e) => (i(...e), n));
  };
}
define(["./workbox-495fd258"], function (e) {
  "use strict";
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute([
      {
        url: "/_next/app-build-manifest.json",
        revision: "0c42c26ad767d97ee2209cf079bcc0e8",
      },
      {
        url: "/_next/static/a6siYp0_mIj9LIvmKs7Ak/_buildManifest.js",
        revision: "d25e95c4fcff2707fdbdf9b83ae63c17",
      },
      {
        url: "/_next/static/a6siYp0_mIj9LIvmKs7Ak/_ssgManifest.js",
        revision: "b6652df95db52feb4daf4eca35380933",
      },
      {
        url: "/_next/static/chunks/10499.8067c6d7c90370da.js",
        revision: "8067c6d7c90370da",
      },
      {
        url: "/_next/static/chunks/10629.3ecafa8d3f6f0d79.js",
        revision: "3ecafa8d3f6f0d79",
      },
      {
        url: "/_next/static/chunks/10804.7d1dcd74c8ba2a03.js",
        revision: "7d1dcd74c8ba2a03",
      },
      {
        url: "/_next/static/chunks/1086.c59fb2e7f255f2cb.js",
        revision: "c59fb2e7f255f2cb",
      },
      {
        url: "/_next/static/chunks/11048.edbe373378812733.js",
        revision: "edbe373378812733",
      },
      {
        url: "/_next/static/chunks/11054.203cfb5050e35a24.js",
        revision: "203cfb5050e35a24",
      },
      {
        url: "/_next/static/chunks/11267.8cf8eb89db39e450.js",
        revision: "8cf8eb89db39e450",
      },
      {
        url: "/_next/static/chunks/1144.89859c7803aa1b16.js",
        revision: "89859c7803aa1b16",
      },
      {
        url: "/_next/static/chunks/11446.8c630c107054f516.js",
        revision: "8c630c107054f516",
      },
      {
        url: "/_next/static/chunks/11555.fd35ea3affc4b51c.js",
        revision: "fd35ea3affc4b51c",
      },
      {
        url: "/_next/static/chunks/11612.ede4fe5ea8424cc3.js",
        revision: "ede4fe5ea8424cc3",
      },
      {
        url: "/_next/static/chunks/11677.a09be7402edb17c7.js",
        revision: "a09be7402edb17c7",
      },
      {
        url: "/_next/static/chunks/12086.d38103ec43a499ad.js",
        revision: "d38103ec43a499ad",
      },
      {
        url: "/_next/static/chunks/12120.44d7461382e497ef.js",
        revision: "44d7461382e497ef",
      },
      {
        url: "/_next/static/chunks/12133.d5f250c83b13cc19.js",
        revision: "d5f250c83b13cc19",
      },
      {
        url: "/_next/static/chunks/12333.862ac593f8aea514.js",
        revision: "862ac593f8aea514",
      },
      {
        url: "/_next/static/chunks/12349.82c44ec5fa98233b.js",
        revision: "82c44ec5fa98233b",
      },
      {
        url: "/_next/static/chunks/12382.f6e934a2c55cd69f.js",
        revision: "f6e934a2c55cd69f",
      },
      {
        url: "/_next/static/chunks/12587.05d75e91a2e140a9.js",
        revision: "05d75e91a2e140a9",
      },
      {
        url: "/_next/static/chunks/12635.4ecb1f10b46e680c.js",
        revision: "4ecb1f10b46e680c",
      },
      {
        url: "/_next/static/chunks/12671.aa34e2bb08acdbe0.js",
        revision: "aa34e2bb08acdbe0",
      },
      {
        url: "/_next/static/chunks/12681.3d97a3009e95ba8f.js",
        revision: "3d97a3009e95ba8f",
      },
      {
        url: "/_next/static/chunks/12748.d50cf377b980642f.js",
        revision: "d50cf377b980642f",
      },
      {
        url: "/_next/static/chunks/12766-23a0c2041a261a73.js",
        revision: "23a0c2041a261a73",
      },
      {
        url: "/_next/static/chunks/1305.831adf99756cf468.js",
        revision: "831adf99756cf468",
      },
      {
        url: "/_next/static/chunks/13153.62c5199c43649a98.js",
        revision: "62c5199c43649a98",
      },
      {
        url: "/_next/static/chunks/13208.262aa01cd840fcc1.js",
        revision: "262aa01cd840fcc1",
      },
      {
        url: "/_next/static/chunks/13361.ce783df15cb88bbc.js",
        revision: "ce783df15cb88bbc",
      },
      {
        url: "/_next/static/chunks/13611.0c87592d2f53ebce.js",
        revision: "0c87592d2f53ebce",
      },
      {
        url: "/_next/static/chunks/13723-1e8362593e62826b.js",
        revision: "1e8362593e62826b",
      },
      {
        url: "/_next/static/chunks/13734.3ed00c6ce746edb2.js",
        revision: "3ed00c6ce746edb2",
      },
      {
        url: "/_next/static/chunks/14282.61c2b2f826235f58.js",
        revision: "61c2b2f826235f58",
      },
      {
        url: "/_next/static/chunks/14484.61f474df75a30adf.js",
        revision: "61f474df75a30adf",
      },
      {
        url: "/_next/static/chunks/14485.818f2559cb5520d3.js",
        revision: "818f2559cb5520d3",
      },
      {
        url: "/_next/static/chunks/14619.3f3eeeeeddfe259f.js",
        revision: "3f3eeeeeddfe259f",
      },
      {
        url: "/_next/static/chunks/14822.4a6060bd7c799081.js",
        revision: "4a6060bd7c799081",
      },
      {
        url: "/_next/static/chunks/14894.febeca44e6e38459.js",
        revision: "febeca44e6e38459",
      },
      {
        url: "/_next/static/chunks/1493.a05f19347ae65705.js",
        revision: "a05f19347ae65705",
      },
      {
        url: "/_next/static/chunks/15079.bd3150bb369318e5.js",
        revision: "bd3150bb369318e5",
      },
      {
        url: "/_next/static/chunks/15189.f138dd880d79a13b.js",
        revision: "f138dd880d79a13b",
      },
      {
        url: "/_next/static/chunks/15292-093c496397188eec.js",
        revision: "093c496397188eec",
      },
      {
        url: "/_next/static/chunks/15349-d164f938a405e1cf.js",
        revision: "d164f938a405e1cf",
      },
      {
        url: "/_next/static/chunks/15623.a80ab3fdc1891792.js",
        revision: "a80ab3fdc1891792",
      },
      {
        url: "/_next/static/chunks/15656-b4422100f0d1b847.js",
        revision: "b4422100f0d1b847",
      },
      {
        url: "/_next/static/chunks/15735.43527b17b065ef40.js",
        revision: "43527b17b065ef40",
      },
      {
        url: "/_next/static/chunks/15810.453b8f7c590be0f5.js",
        revision: "453b8f7c590be0f5",
      },
      {
        url: "/_next/static/chunks/15918.1a95d760e37c4761.js",
        revision: "1a95d760e37c4761",
      },
      {
        url: "/_next/static/chunks/15998.a5e6af28b877452d.js",
        revision: "a5e6af28b877452d",
      },
      {
        url: "/_next/static/chunks/1614.48ea3b7ad43f2bcb.js",
        revision: "48ea3b7ad43f2bcb",
      },
      {
        url: "/_next/static/chunks/1626.7063fb47a1ec0aaa.js",
        revision: "7063fb47a1ec0aaa",
      },
      {
        url: "/_next/static/chunks/16288.b668acd6b36a8e92.js",
        revision: "b668acd6b36a8e92",
      },
      {
        url: "/_next/static/chunks/16481.68891bb2ce40b58a.js",
        revision: "68891bb2ce40b58a",
      },
      {
        url: "/_next/static/chunks/165.9d4a4f1b9b2304b0.js",
        revision: "9d4a4f1b9b2304b0",
      },
      {
        url: "/_next/static/chunks/16827.5008caead04ab6d4.js",
        revision: "5008caead04ab6d4",
      },
      {
        url: "/_next/static/chunks/16993.f7c391f3dd8a6843.js",
        revision: "f7c391f3dd8a6843",
      },
      {
        url: "/_next/static/chunks/17042.22de74b485a09212.js",
        revision: "22de74b485a09212",
      },
      {
        url: "/_next/static/chunks/17211.530bc9219f6b0898.js",
        revision: "530bc9219f6b0898",
      },
      {
        url: "/_next/static/chunks/17424-6e532810d220c06e.js",
        revision: "6e532810d220c06e",
      },
      {
        url: "/_next/static/chunks/17488.859d1237e4d502ea.js",
        revision: "859d1237e4d502ea",
      },
      {
        url: "/_next/static/chunks/17564.64fcf988fe00de8f.js",
        revision: "64fcf988fe00de8f",
      },
      {
        url: "/_next/static/chunks/17596.64ca1caeff339a83.js",
        revision: "64ca1caeff339a83",
      },
      {
        url: "/_next/static/chunks/17760.0b52d59971817881.js",
        revision: "0b52d59971817881",
      },
      {
        url: "/_next/static/chunks/17922.a87c7e5cb6e16428.js",
        revision: "a87c7e5cb6e16428",
      },
      {
        url: "/_next/static/chunks/18026.d33b793c0a911b05.js",
        revision: "d33b793c0a911b05",
      },
      {
        url: "/_next/static/chunks/18098.9ad8825fe3b288dd.js",
        revision: "9ad8825fe3b288dd",
      },
      {
        url: "/_next/static/chunks/18109-78f90e422468d8d1.js",
        revision: "78f90e422468d8d1",
      },
      {
        url: "/_next/static/chunks/18120.a40e112b825ea84e.js",
        revision: "a40e112b825ea84e",
      },
      {
        url: "/_next/static/chunks/18383.b4f350228e2bbe62.js",
        revision: "b4f350228e2bbe62",
      },
      {
        url: "/_next/static/chunks/18800.a8df8064138fd994.js",
        revision: "a8df8064138fd994",
      },
      {
        url: "/_next/static/chunks/18907.594f35e494dd4705.js",
        revision: "594f35e494dd4705",
      },
      {
        url: "/_next/static/chunks/19043.ee4efc3af4c5d5fc.js",
        revision: "ee4efc3af4c5d5fc",
      },
      {
        url: "/_next/static/chunks/19149.396346abaa42123e.js",
        revision: "396346abaa42123e",
      },
      {
        url: "/_next/static/chunks/19548.edeeb5538a8b32bc.js",
        revision: "edeeb5538a8b32bc",
      },
      {
        url: "/_next/static/chunks/19847.a610e1f6e6aab8cd.js",
        revision: "a610e1f6e6aab8cd",
      },
      {
        url: "/_next/static/chunks/19909.50a836a2a32fbe6e.js",
        revision: "50a836a2a32fbe6e",
      },
      {
        url: "/_next/static/chunks/19992.c650c42353d4e6d3.js",
        revision: "c650c42353d4e6d3",
      },
      {
        url: "/_next/static/chunks/20172.ed984559690635ce.js",
        revision: "ed984559690635ce",
      },
      {
        url: "/_next/static/chunks/20198.6d00c342bfb6c386.js",
        revision: "6d00c342bfb6c386",
      },
      {
        url: "/_next/static/chunks/20271.9ce39ab9c0052311.js",
        revision: "9ce39ab9c0052311",
      },
      {
        url: "/_next/static/chunks/20620.a9cd7c6a9330e894.js",
        revision: "a9cd7c6a9330e894",
      },
      {
        url: "/_next/static/chunks/20786.815e545c89140d7d.js",
        revision: "815e545c89140d7d",
      },
      {
        url: "/_next/static/chunks/20908.202350900f437200.js",
        revision: "202350900f437200",
      },
      {
        url: "/_next/static/chunks/21050.1a971187c9001646.js",
        revision: "1a971187c9001646",
      },
      {
        url: "/_next/static/chunks/21187.658ef943ce52ac77.js",
        revision: "658ef943ce52ac77",
      },
      {
        url: "/_next/static/chunks/21267.c52090a640235d95.js",
        revision: "c52090a640235d95",
      },
      {
        url: "/_next/static/chunks/21349.fae71c9ea4ec5b6e.js",
        revision: "fae71c9ea4ec5b6e",
      },
      {
        url: "/_next/static/chunks/21376.855fb2366eca50b9.js",
        revision: "855fb2366eca50b9",
      },
      {
        url: "/_next/static/chunks/21575.7b5c7b147b88eeab.js",
        revision: "7b5c7b147b88eeab",
      },
      {
        url: "/_next/static/chunks/21752.d973b10a9adcf534.js",
        revision: "d973b10a9adcf534",
      },
      {
        url: "/_next/static/chunks/2197.7373c8f826551ded.js",
        revision: "7373c8f826551ded",
      },
      {
        url: "/_next/static/chunks/21988.0b1af967f79475f7.js",
        revision: "0b1af967f79475f7",
      },
      {
        url: "/_next/static/chunks/22368.cb20b9181f813bd6.js",
        revision: "cb20b9181f813bd6",
      },
      {
        url: "/_next/static/chunks/22571.b9a8a000f6290d96.js",
        revision: "b9a8a000f6290d96",
      },
      {
        url: "/_next/static/chunks/22723.d29f33a53996d0ad.js",
        revision: "d29f33a53996d0ad",
      },
      {
        url: "/_next/static/chunks/22999.53d95c9bd3177e90.js",
        revision: "53d95c9bd3177e90",
      },
      {
        url: "/_next/static/chunks/23033.436ca5053da70dd4.js",
        revision: "436ca5053da70dd4",
      },
      {
        url: "/_next/static/chunks/23049-662cf910778a8bf5.js",
        revision: "662cf910778a8bf5",
      },
      {
        url: "/_next/static/chunks/23099.486c0045a0ec0ed0.js",
        revision: "486c0045a0ec0ed0",
      },
      {
        url: "/_next/static/chunks/23298.cc5277c5b2616f3e.js",
        revision: "cc5277c5b2616f3e",
      },
      {
        url: "/_next/static/chunks/23321.8e6098895dcca182.js",
        revision: "8e6098895dcca182",
      },
      {
        url: "/_next/static/chunks/2342.a82b89ee6972aebc.js",
        revision: "a82b89ee6972aebc",
      },
      {
        url: "/_next/static/chunks/23791.0b747fbeb150b807.js",
        revision: "0b747fbeb150b807",
      },
      {
        url: "/_next/static/chunks/23954.1d119dd11991fc08.js",
        revision: "1d119dd11991fc08",
      },
      {
        url: "/_next/static/chunks/2449.5d8927427d26062d.js",
        revision: "5d8927427d26062d",
      },
      {
        url: "/_next/static/chunks/24814.996f85d5880d4fa5.js",
        revision: "996f85d5880d4fa5",
      },
      {
        url: "/_next/static/chunks/24949.265d7ddd518fef6a.js",
        revision: "265d7ddd518fef6a",
      },
      {
        url: "/_next/static/chunks/25-cbef9a3d0250fba4.js",
        revision: "cbef9a3d0250fba4",
      },
      {
        url: "/_next/static/chunks/25066.90d31846c6166865.js",
        revision: "90d31846c6166865",
      },
      {
        url: "/_next/static/chunks/25150.55c6446cc9442278.js",
        revision: "55c6446cc9442278",
      },
      {
        url: "/_next/static/chunks/25190.b47f6f797b6a88bc.js",
        revision: "b47f6f797b6a88bc",
      },
      {
        url: "/_next/static/chunks/25202.9dd3f6375db9004e.js",
        revision: "9dd3f6375db9004e",
      },
      {
        url: "/_next/static/chunks/25223.9bb6ad9b054dbba5.js",
        revision: "9bb6ad9b054dbba5",
      },
      {
        url: "/_next/static/chunks/25340.767a67e7ec332c55.js",
        revision: "767a67e7ec332c55",
      },
      {
        url: "/_next/static/chunks/25445.4bc64439ceac8c0f.js",
        revision: "4bc64439ceac8c0f",
      },
      {
        url: "/_next/static/chunks/25599.ec03eefaaa414224.js",
        revision: "ec03eefaaa414224",
      },
      {
        url: "/_next/static/chunks/25657.6f04f23e0d28c886.js",
        revision: "6f04f23e0d28c886",
      },
      {
        url: "/_next/static/chunks/25719.9edfd86c8d84cc19.js",
        revision: "9edfd86c8d84cc19",
      },
      {
        url: "/_next/static/chunks/25755.349bf4d09bfd1c7f.js",
        revision: "349bf4d09bfd1c7f",
      },
      {
        url: "/_next/static/chunks/25814.c807330a6bd12cf9.js",
        revision: "c807330a6bd12cf9",
      },
      {
        url: "/_next/static/chunks/26245.b6be404afae3de6c.js",
        revision: "b6be404afae3de6c",
      },
      {
        url: "/_next/static/chunks/26360.c387821288ce7704.js",
        revision: "c387821288ce7704",
      },
      {
        url: "/_next/static/chunks/26465.63d67e5fc98efc42.js",
        revision: "63d67e5fc98efc42",
      },
      {
        url: "/_next/static/chunks/26537-7760c255ae7de57c.js",
        revision: "7760c255ae7de57c",
      },
      {
        url: "/_next/static/chunks/2656.827ac6d815b429ea.js",
        revision: "827ac6d815b429ea",
      },
      {
        url: "/_next/static/chunks/26888-9e08f6c49959f927.js",
        revision: "9e08f6c49959f927",
      },
      {
        url: "/_next/static/chunks/26897.b01604d667662109.js",
        revision: "b01604d667662109",
      },
      {
        url: "/_next/static/chunks/27054.0a664789c4b90c9b.js",
        revision: "0a664789c4b90c9b",
      },
      {
        url: "/_next/static/chunks/27295.f274c763c777c60c.js",
        revision: "f274c763c777c60c",
      },
      {
        url: "/_next/static/chunks/27387-d94bdaa047fcd1c1.js",
        revision: "d94bdaa047fcd1c1",
      },
      {
        url: "/_next/static/chunks/27448-85d11f64bc9f6f1d.js",
        revision: "85d11f64bc9f6f1d",
      },
      {
        url: "/_next/static/chunks/27556.ea55602977dd55cd.js",
        revision: "ea55602977dd55cd",
      },
      {
        url: "/_next/static/chunks/27662.ebbfe5f48ff8d069.js",
        revision: "ebbfe5f48ff8d069",
      },
      {
        url: "/_next/static/chunks/27824.7c24297e65ffb837.js",
        revision: "7c24297e65ffb837",
      },
      {
        url: "/_next/static/chunks/27936.4f81358a4fc1eadb.js",
        revision: "4f81358a4fc1eadb",
      },
      {
        url: "/_next/static/chunks/27956.3aa2bedc2dbff3d9.js",
        revision: "3aa2bedc2dbff3d9",
      },
      {
        url: "/_next/static/chunks/2818.1ee5eafc2e9346df.js",
        revision: "1ee5eafc2e9346df",
      },
      {
        url: "/_next/static/chunks/28669.bd14845a47d96969.js",
        revision: "bd14845a47d96969",
      },
      {
        url: "/_next/static/chunks/28701.6dcdc2d22b7dcf11.js",
        revision: "6dcdc2d22b7dcf11",
      },
      {
        url: "/_next/static/chunks/28809.ef7a02a8a483f05a.js",
        revision: "ef7a02a8a483f05a",
      },
      {
        url: "/_next/static/chunks/28853.c78a800b6913237e.js",
        revision: "c78a800b6913237e",
      },
      {
        url: "/_next/static/chunks/29072.f3154adf5eec32a1.js",
        revision: "f3154adf5eec32a1",
      },
      {
        url: "/_next/static/chunks/29096.d9fa391245763ba0.js",
        revision: "d9fa391245763ba0",
      },
      {
        url: "/_next/static/chunks/29228.a270bfb231802d7b.js",
        revision: "a270bfb231802d7b",
      },
      {
        url: "/_next/static/chunks/29233.8d1fbfb4665681b4.js",
        revision: "8d1fbfb4665681b4",
      },
      {
        url: "/_next/static/chunks/29499.1c333cd7a67aa94d.js",
        revision: "1c333cd7a67aa94d",
      },
      {
        url: "/_next/static/chunks/29899.5688736eac9a6791.js",
        revision: "5688736eac9a6791",
      },
      {
        url: "/_next/static/chunks/2996.513ffc7f6a74ad0e.js",
        revision: "513ffc7f6a74ad0e",
      },
      {
        url: "/_next/static/chunks/30038.36a32fde7b9b05c5.js",
        revision: "36a32fde7b9b05c5",
      },
      {
        url: "/_next/static/chunks/30364.874e67f32779f5e1.js",
        revision: "874e67f32779f5e1",
      },
      {
        url: "/_next/static/chunks/30492.1a9c442d3900c60b.js",
        revision: "1a9c442d3900c60b",
      },
      {
        url: "/_next/static/chunks/30608.c6e37450d9ac1b8d.js",
        revision: "c6e37450d9ac1b8d",
      },
      {
        url: "/_next/static/chunks/30728.6ac99dc4d6911e6c.js",
        revision: "6ac99dc4d6911e6c",
      },
      {
        url: "/_next/static/chunks/30816-2a5e050cc0e811e6.js",
        revision: "2a5e050cc0e811e6",
      },
      {
        url: "/_next/static/chunks/30892.726bd300bbdd0508.js",
        revision: "726bd300bbdd0508",
      },
      {
        url: "/_next/static/chunks/31014.c3cafdb97d2e287b.js",
        revision: "c3cafdb97d2e287b",
      },
      {
        url: "/_next/static/chunks/31026.c429daa5a09741b5.js",
        revision: "c429daa5a09741b5",
      },
      {
        url: "/_next/static/chunks/31091.79df3a6cdbe8d0aa.js",
        revision: "79df3a6cdbe8d0aa",
      },
      {
        url: "/_next/static/chunks/31184.ed3db46674e074eb.js",
        revision: "ed3db46674e074eb",
      },
      {
        url: "/_next/static/chunks/31255-09b3d4d4ab97ce15.js",
        revision: "09b3d4d4ab97ce15",
      },
      {
        url: "/_next/static/chunks/31370.94df03b98ef37a62.js",
        revision: "94df03b98ef37a62",
      },
      {
        url: "/_next/static/chunks/31430.ed69c7165be89101.js",
        revision: "ed69c7165be89101",
      },
      {
        url: "/_next/static/chunks/31456.97281b161dd55398.js",
        revision: "97281b161dd55398",
      },
      {
        url: "/_next/static/chunks/31492.3d8abcba51c14727.js",
        revision: "3d8abcba51c14727",
      },
      {
        url: "/_next/static/chunks/31513.8c0d4044d2353a2d.js",
        revision: "8c0d4044d2353a2d",
      },
      {
        url: "/_next/static/chunks/31746.3755a2e9f48360f9.js",
        revision: "3755a2e9f48360f9",
      },
      {
        url: "/_next/static/chunks/32054.b6ec733feb3f2e47.js",
        revision: "b6ec733feb3f2e47",
      },
      {
        url: "/_next/static/chunks/32234.be651e580d198563.js",
        revision: "be651e580d198563",
      },
      {
        url: "/_next/static/chunks/3232.ea9b99b2d1a0c6f2.js",
        revision: "ea9b99b2d1a0c6f2",
      },
      {
        url: "/_next/static/chunks/32320.505d68d4e1f66964.js",
        revision: "505d68d4e1f66964",
      },
      {
        url: "/_next/static/chunks/32555.233a7269d0b43b36.js",
        revision: "233a7269d0b43b36",
      },
      {
        url: "/_next/static/chunks/32647.a99b8be2c84fb628.js",
        revision: "a99b8be2c84fb628",
      },
      {
        url: "/_next/static/chunks/32777.466c9a9cbeceb5c2.js",
        revision: "466c9a9cbeceb5c2",
      },
      {
        url: "/_next/static/chunks/32845.16f5fc09fa000057.js",
        revision: "16f5fc09fa000057",
      },
      {
        url: "/_next/static/chunks/33076-da9243a4b2163ec9.js",
        revision: "da9243a4b2163ec9",
      },
      {
        url: "/_next/static/chunks/33550.817be66135f6a726.js",
        revision: "817be66135f6a726",
      },
      {
        url: "/_next/static/chunks/33622.19f4e673de6a510b.js",
        revision: "19f4e673de6a510b",
      },
      {
        url: "/_next/static/chunks/34001.2bb88185ff96104b.js",
        revision: "2bb88185ff96104b",
      },
      {
        url: "/_next/static/chunks/34086.0852984520e13a18.js",
        revision: "0852984520e13a18",
      },
      {
        url: "/_next/static/chunks/34131.0205f38569e86db1.js",
        revision: "0205f38569e86db1",
      },
      {
        url: "/_next/static/chunks/34381.042812ee5bc6c272.js",
        revision: "042812ee5bc6c272",
      },
      {
        url: "/_next/static/chunks/34759.73db1892f4433c5c.js",
        revision: "73db1892f4433c5c",
      },
      {
        url: "/_next/static/chunks/34801.bfb262a2562bea3f.js",
        revision: "bfb262a2562bea3f",
      },
      {
        url: "/_next/static/chunks/3533.fcc81549f0eed1c9.js",
        revision: "fcc81549f0eed1c9",
      },
      {
        url: "/_next/static/chunks/35438.4f8354bf9809e173.js",
        revision: "4f8354bf9809e173",
      },
      {
        url: "/_next/static/chunks/35517.90cf065b41dcc651.js",
        revision: "90cf065b41dcc651",
      },
      {
        url: "/_next/static/chunks/35611.4c0ea0fcd2c458f1.js",
        revision: "4c0ea0fcd2c458f1",
      },
      {
        url: "/_next/static/chunks/35711.ecf565917ec7d11d.js",
        revision: "ecf565917ec7d11d",
      },
      {
        url: "/_next/static/chunks/35834-115a7fd6006c2cdb.js",
        revision: "115a7fd6006c2cdb",
      },
      {
        url: "/_next/static/chunks/35933.d2e195de5588a10c.js",
        revision: "d2e195de5588a10c",
      },
      {
        url: "/_next/static/chunks/35940.d4cee5c8340a49fd.js",
        revision: "d4cee5c8340a49fd",
      },
      {
        url: "/_next/static/chunks/35952.433a762983199192.js",
        revision: "433a762983199192",
      },
      {
        url: "/_next/static/chunks/36433.e7ca515d4f3cdebb.js",
        revision: "e7ca515d4f3cdebb",
      },
      {
        url: "/_next/static/chunks/36564-0516db1f1fc3b220.js",
        revision: "0516db1f1fc3b220",
      },
      {
        url: "/_next/static/chunks/36626.6d529337e987bf60.js",
        revision: "6d529337e987bf60",
      },
      {
        url: "/_next/static/chunks/36838.624c1c27535b2a54.js",
        revision: "624c1c27535b2a54",
      },
      {
        url: "/_next/static/chunks/36915.f5e48400242e1930.js",
        revision: "f5e48400242e1930",
      },
      {
        url: "/_next/static/chunks/36937.611f6961460ceadd.js",
        revision: "611f6961460ceadd",
      },
      {
        url: "/_next/static/chunks/36959.3007678a571f0168.js",
        revision: "3007678a571f0168",
      },
      {
        url: "/_next/static/chunks/370.a4f341aaff695249.js",
        revision: "a4f341aaff695249",
      },
      {
        url: "/_next/static/chunks/37093.afc7083258d98311.js",
        revision: "afc7083258d98311",
      },
      {
        url: "/_next/static/chunks/37124.2bbd6c6ed8c4f76e.js",
        revision: "2bbd6c6ed8c4f76e",
      },
      {
        url: "/_next/static/chunks/3724.45871274d9653f3e.js",
        revision: "45871274d9653f3e",
      },
      {
        url: "/_next/static/chunks/37375.2c6b78e5dbf24f66.js",
        revision: "2c6b78e5dbf24f66",
      },
      {
        url: "/_next/static/chunks/37410.22a77e17f6aba615.js",
        revision: "22a77e17f6aba615",
      },
      {
        url: "/_next/static/chunks/37591.dbdee32ca7eed987.js",
        revision: "dbdee32ca7eed987",
      },
      {
        url: "/_next/static/chunks/37653.51a1b2a9333a9184.js",
        revision: "51a1b2a9333a9184",
      },
      {
        url: "/_next/static/chunks/3767.e035889454199199.js",
        revision: "e035889454199199",
      },
      {
        url: "/_next/static/chunks/37901.b29adaef177e0d1f.js",
        revision: "b29adaef177e0d1f",
      },
      {
        url: "/_next/static/chunks/37958.16286cff754d31e4.js",
        revision: "16286cff754d31e4",
      },
      {
        url: "/_next/static/chunks/38073-e5ccffa715d5a4af.js",
        revision: "e5ccffa715d5a4af",
      },
      {
        url: "/_next/static/chunks/38179.a68f7261fd13f59e.js",
        revision: "a68f7261fd13f59e",
      },
      {
        url: "/_next/static/chunks/38238.ab983c3cbd8ac9a5.js",
        revision: "ab983c3cbd8ac9a5",
      },
      {
        url: "/_next/static/chunks/38481.17272c7ebe770af4.js",
        revision: "17272c7ebe770af4",
      },
      {
        url: "/_next/static/chunks/38522.69e3da07c555aab8.js",
        revision: "69e3da07c555aab8",
      },
      {
        url: "/_next/static/chunks/38624.4bad3b9fea3b5b94.js",
        revision: "4bad3b9fea3b5b94",
      },
      {
        url: "/_next/static/chunks/38694.145717055e3ec5c0.js",
        revision: "145717055e3ec5c0",
      },
      {
        url: "/_next/static/chunks/38970.6907c19cf83e3700.js",
        revision: "6907c19cf83e3700",
      },
      {
        url: "/_next/static/chunks/392.97e92089027aad77.js",
        revision: "97e92089027aad77",
      },
      {
        url: "/_next/static/chunks/39287.15c64e09b6d9907d.js",
        revision: "15c64e09b6d9907d",
      },
      {
        url: "/_next/static/chunks/39409.ef54880db5b2fb2b.js",
        revision: "ef54880db5b2fb2b",
      },
      {
        url: "/_next/static/chunks/39603-cc510cc4a890dd90.js",
        revision: "cc510cc4a890dd90",
      },
      {
        url: "/_next/static/chunks/39788.bfaeae0f76ccb61b.js",
        revision: "bfaeae0f76ccb61b",
      },
      {
        url: "/_next/static/chunks/39882.c2a6b063bb00b28c.js",
        revision: "c2a6b063bb00b28c",
      },
      {
        url: "/_next/static/chunks/3993.322e135254a30705.js",
        revision: "322e135254a30705",
      },
      {
        url: "/_next/static/chunks/40006.dadc380b19b89d22.js",
        revision: "dadc380b19b89d22",
      },
      {
        url: "/_next/static/chunks/4008.69171cae7b57df5e.js",
        revision: "69171cae7b57df5e",
      },
      {
        url: "/_next/static/chunks/40252.aed8f5ff06b49566.js",
        revision: "aed8f5ff06b49566",
      },
      {
        url: "/_next/static/chunks/40255.4afeb56239412cd4.js",
        revision: "4afeb56239412cd4",
      },
      {
        url: "/_next/static/chunks/40616.0e483ac958f4957d.js",
        revision: "0e483ac958f4957d",
      },
      {
        url: "/_next/static/chunks/40659-d149f1e365abc3cf.js",
        revision: "d149f1e365abc3cf",
      },
      {
        url: "/_next/static/chunks/40770.ccbe13666388b717.js",
        revision: "ccbe13666388b717",
      },
      {
        url: "/_next/static/chunks/40798.9efb9a6eff0c930c.js",
        revision: "9efb9a6eff0c930c",
      },
      {
        url: "/_next/static/chunks/40863.cb883b3deb901bf3.js",
        revision: "cb883b3deb901bf3",
      },
      {
        url: "/_next/static/chunks/40936.931e04b329ca7e9e.js",
        revision: "931e04b329ca7e9e",
      },
      {
        url: "/_next/static/chunks/41.89560344a249ad25.js",
        revision: "89560344a249ad25",
      },
      {
        url: "/_next/static/chunks/41044.6474337d0f541aac.js",
        revision: "6474337d0f541aac",
      },
      {
        url: "/_next/static/chunks/41242-aa6fe9af3fb76120.js",
        revision: "aa6fe9af3fb76120",
      },
      {
        url: "/_next/static/chunks/41509.e089f146d8144219.js",
        revision: "e089f146d8144219",
      },
      {
        url: "/_next/static/chunks/41579.be9011c40a136600.js",
        revision: "be9011c40a136600",
      },
      {
        url: "/_next/static/chunks/41797.1b8e17cc7050c0a3.js",
        revision: "1b8e17cc7050c0a3",
      },
      {
        url: "/_next/static/chunks/41960.d6c3ff09578b49f1.js",
        revision: "d6c3ff09578b49f1",
      },
      {
        url: "/_next/static/chunks/41988.40c7b3ba356d94a5.js",
        revision: "40c7b3ba356d94a5",
      },
      {
        url: "/_next/static/chunks/42282.f0c6a2eb085ad8de.js",
        revision: "f0c6a2eb085ad8de",
      },
      {
        url: "/_next/static/chunks/42398.67709a39349efb3e.js",
        revision: "67709a39349efb3e",
      },
      {
        url: "/_next/static/chunks/42497.aaf8213c80367f5b.js",
        revision: "aaf8213c80367f5b",
      },
      {
        url: "/_next/static/chunks/4252.a94f639c5c07c398.js",
        revision: "a94f639c5c07c398",
      },
      {
        url: "/_next/static/chunks/426.08479490b5be538c.js",
        revision: "08479490b5be538c",
      },
      {
        url: "/_next/static/chunks/42692.4085dc343981d7ed.js",
        revision: "4085dc343981d7ed",
      },
      {
        url: "/_next/static/chunks/42718.f682f9427beebc31.js",
        revision: "f682f9427beebc31",
      },
      {
        url: "/_next/static/chunks/42793.5014d096c64b8592.js",
        revision: "5014d096c64b8592",
      },
      {
        url: "/_next/static/chunks/42901.d716c7f45dfd5dae.js",
        revision: "d716c7f45dfd5dae",
      },
      {
        url: "/_next/static/chunks/42970.f5bcb624033d01ce.js",
        revision: "f5bcb624033d01ce",
      },
      {
        url: "/_next/static/chunks/4305-fb1d821759810bed.js",
        revision: "fb1d821759810bed",
      },
      {
        url: "/_next/static/chunks/43078.189154144532df32.js",
        revision: "189154144532df32",
      },
      {
        url: "/_next/static/chunks/43095.ca6920a4edbe3aca.js",
        revision: "ca6920a4edbe3aca",
      },
      {
        url: "/_next/static/chunks/43660.5a9f8607867a22af.js",
        revision: "5a9f8607867a22af",
      },
      {
        url: "/_next/static/chunks/43713.780d5a6bcd3a11b3.js",
        revision: "780d5a6bcd3a11b3",
      },
      {
        url: "/_next/static/chunks/43808.2c333c66effcf5b6.js",
        revision: "2c333c66effcf5b6",
      },
      {
        url: "/_next/static/chunks/44002.2dd9a800c701149d.js",
        revision: "2dd9a800c701149d",
      },
      {
        url: "/_next/static/chunks/44260.2229293bcbe1753f.js",
        revision: "2229293bcbe1753f",
      },
      {
        url: "/_next/static/chunks/44267.0f3331ce288de247.js",
        revision: "0f3331ce288de247",
      },
      {
        url: "/_next/static/chunks/44277-28075db3f272824d.js",
        revision: "28075db3f272824d",
      },
      {
        url: "/_next/static/chunks/44488.a7f279ec65d8b33f.js",
        revision: "a7f279ec65d8b33f",
      },
      {
        url: "/_next/static/chunks/44579.b345db0367c32c6f.js",
        revision: "b345db0367c32c6f",
      },
      {
        url: "/_next/static/chunks/44611.9889046f73dab690.js",
        revision: "9889046f73dab690",
      },
      {
        url: "/_next/static/chunks/45086.cfbb5260657b4496.js",
        revision: "cfbb5260657b4496",
      },
      {
        url: "/_next/static/chunks/45262.698ab4ac008d1d87.js",
        revision: "698ab4ac008d1d87",
      },
      {
        url: "/_next/static/chunks/45380.360f6f1c18c00650.js",
        revision: "360f6f1c18c00650",
      },
      {
        url: "/_next/static/chunks/45591-fdbc65c584c1aff4.js",
        revision: "fdbc65c584c1aff4",
      },
      {
        url: "/_next/static/chunks/45737.46adcafe41df5c44.js",
        revision: "46adcafe41df5c44",
      },
      {
        url: "/_next/static/chunks/45913.c984d814d48b87af.js",
        revision: "c984d814d48b87af",
      },
      {
        url: "/_next/static/chunks/45940.3ee7924baebb8486.js",
        revision: "3ee7924baebb8486",
      },
      {
        url: "/_next/static/chunks/45987-730d2623b16b8963.js",
        revision: "730d2623b16b8963",
      },
      {
        url: "/_next/static/chunks/45989.3a3e2f21c4890e01.js",
        revision: "3a3e2f21c4890e01",
      },
      {
        url: "/_next/static/chunks/46034.871b957e89a123ee.js",
        revision: "871b957e89a123ee",
      },
      {
        url: "/_next/static/chunks/46086-bbc4c9d795ab16fa.js",
        revision: "bbc4c9d795ab16fa",
      },
      {
        url: "/_next/static/chunks/46157.86fc84cf14475089.js",
        revision: "86fc84cf14475089",
      },
      {
        url: "/_next/static/chunks/46214.3a7ec5c6b15aa28b.js",
        revision: "3a7ec5c6b15aa28b",
      },
      {
        url: "/_next/static/chunks/46441.7a9f4cac2639397d.js",
        revision: "7a9f4cac2639397d",
      },
      {
        url: "/_next/static/chunks/46445.87f012fb2f6b6f4f.js",
        revision: "87f012fb2f6b6f4f",
      },
      {
        url: "/_next/static/chunks/46566.cea4b5f99a9f4a2c.js",
        revision: "cea4b5f99a9f4a2c",
      },
      {
        url: "/_next/static/chunks/46579.39ea9d18bb4c8713.js",
        revision: "39ea9d18bb4c8713",
      },
      {
        url: "/_next/static/chunks/47191.6a40ada64458d5be.js",
        revision: "6a40ada64458d5be",
      },
      {
        url: "/_next/static/chunks/4735.acb8019b4ee6cca9.js",
        revision: "acb8019b4ee6cca9",
      },
      {
        url: "/_next/static/chunks/47510.02f9b0b69b16eff4.js",
        revision: "02f9b0b69b16eff4",
      },
      {
        url: "/_next/static/chunks/47516.cf9b2db0651e3210.js",
        revision: "cf9b2db0651e3210",
      },
      {
        url: "/_next/static/chunks/47581.f82e7173ed7462a8.js",
        revision: "f82e7173ed7462a8",
      },
      {
        url: "/_next/static/chunks/47722.7d77db123099f62f.js",
        revision: "7d77db123099f62f",
      },
      {
        url: "/_next/static/chunks/47951-398cbf45f6ad0c45.js",
        revision: "398cbf45f6ad0c45",
      },
      {
        url: "/_next/static/chunks/47981.62a1c99b2271e637.js",
        revision: "62a1c99b2271e637",
      },
      {
        url: "/_next/static/chunks/48021.3f674456182f2db9.js",
        revision: "3f674456182f2db9",
      },
      {
        url: "/_next/static/chunks/48103.ff6a3fe8c9cb5882.js",
        revision: "ff6a3fe8c9cb5882",
      },
      {
        url: "/_next/static/chunks/48175.7ee37b51a09a996f.js",
        revision: "7ee37b51a09a996f",
      },
      {
        url: "/_next/static/chunks/48217.5ab5a3000438acd2.js",
        revision: "5ab5a3000438acd2",
      },
      {
        url: "/_next/static/chunks/48472.6d4fbe4f18a0b08d.js",
        revision: "6d4fbe4f18a0b08d",
      },
      {
        url: "/_next/static/chunks/48624.725217dd74d12eb0.js",
        revision: "725217dd74d12eb0",
      },
      {
        url: "/_next/static/chunks/48657-22297002fc8526e6.js",
        revision: "22297002fc8526e6",
      },
      {
        url: "/_next/static/chunks/48690.4ebfda15631ef653.js",
        revision: "4ebfda15631ef653",
      },
      {
        url: "/_next/static/chunks/48837.85c118634c0d3b2b.js",
        revision: "85c118634c0d3b2b",
      },
      {
        url: "/_next/static/chunks/49181.1b56f615e84984fb.js",
        revision: "1b56f615e84984fb",
      },
      {
        url: "/_next/static/chunks/49326.0bbbf0c90339f0f7.js",
        revision: "0bbbf0c90339f0f7",
      },
      {
        url: "/_next/static/chunks/49426.b8dd43ecc5b6ecc6.js",
        revision: "b8dd43ecc5b6ecc6",
      },
      {
        url: "/_next/static/chunks/49611.2a810cbe9fb62316.js",
        revision: "2a810cbe9fb62316",
      },
      {
        url: "/_next/static/chunks/4bd1b696-bad92808725a934a.js",
        revision: "bad92808725a934a",
      },
      {
        url: "/_next/static/chunks/50142.641aee41893d6b32.js",
        revision: "641aee41893d6b32",
      },
      {
        url: "/_next/static/chunks/50278.a41cb7d5ab8479a1.js",
        revision: "a41cb7d5ab8479a1",
      },
      {
        url: "/_next/static/chunks/50432.5232339951c5f4d2.js",
        revision: "5232339951c5f4d2",
      },
      {
        url: "/_next/static/chunks/50517dc5-7fab22363d1d6345.js",
        revision: "7fab22363d1d6345",
      },
      {
        url: "/_next/static/chunks/5072.dfdcb39386e58e82.js",
        revision: "dfdcb39386e58e82",
      },
      {
        url: "/_next/static/chunks/51127.2e2e989cb6853af2.js",
        revision: "2e2e989cb6853af2",
      },
      {
        url: "/_next/static/chunks/51324.bab91a367fcc9de6.js",
        revision: "bab91a367fcc9de6",
      },
      {
        url: "/_next/static/chunks/51435.e287ae72951ebd47.js",
        revision: "e287ae72951ebd47",
      },
      {
        url: "/_next/static/chunks/51464.510f20540312b56b.js",
        revision: "510f20540312b56b",
      },
      {
        url: "/_next/static/chunks/51540.e5372fe8ca2f463f.js",
        revision: "e5372fe8ca2f463f",
      },
      {
        url: "/_next/static/chunks/51721.db3a171853ddbf58.js",
        revision: "db3a171853ddbf58",
      },
      {
        url: "/_next/static/chunks/5179.b7c98c96a7e64263.js",
        revision: "b7c98c96a7e64263",
      },
      {
        url: "/_next/static/chunks/51af2d27-73407ae74e6ecb35.js",
        revision: "73407ae74e6ecb35",
      },
      {
        url: "/_next/static/chunks/52316.3edb7911ac92ca89.js",
        revision: "3edb7911ac92ca89",
      },
      {
        url: "/_next/static/chunks/5251.4ab1ed419f001154.js",
        revision: "4ab1ed419f001154",
      },
      {
        url: "/_next/static/chunks/52597.33352488ff595f4f.js",
        revision: "33352488ff595f4f",
      },
      {
        url: "/_next/static/chunks/52807.6e8fc6541acdc24a.js",
        revision: "6e8fc6541acdc24a",
      },
      {
        url: "/_next/static/chunks/53131.3ef24b77ece1c3d5.js",
        revision: "3ef24b77ece1c3d5",
      },
      {
        url: "/_next/static/chunks/53555.7403e626a327fbc2.js",
        revision: "7403e626a327fbc2",
      },
      {
        url: "/_next/static/chunks/53564.5165d4fd386fbc09.js",
        revision: "5165d4fd386fbc09",
      },
      {
        url: "/_next/static/chunks/53775.e2fadf8fbb5a9686.js",
        revision: "e2fadf8fbb5a9686",
      },
      {
        url: "/_next/static/chunks/53845.b338eda31f2ec178.js",
        revision: "b338eda31f2ec178",
      },
      {
        url: "/_next/static/chunks/54029.8027ea6fb36d8a88.js",
        revision: "8027ea6fb36d8a88",
      },
      {
        url: "/_next/static/chunks/54135.f459a5f0da0a1a49.js",
        revision: "f459a5f0da0a1a49",
      },
      {
        url: "/_next/static/chunks/54148.72b3aafbf9e0395d.js",
        revision: "72b3aafbf9e0395d",
      },
      {
        url: "/_next/static/chunks/54150.16673b665600d2d4.js",
        revision: "16673b665600d2d4",
      },
      {
        url: "/_next/static/chunks/5416.6effaf1d387444d2.js",
        revision: "6effaf1d387444d2",
      },
      {
        url: "/_next/static/chunks/54349.b32dd630bf4862bb.js",
        revision: "b32dd630bf4862bb",
      },
      {
        url: "/_next/static/chunks/54431-cd1ad61d00bca14f.js",
        revision: "cd1ad61d00bca14f",
      },
      {
        url: "/_next/static/chunks/54817.62ffb73f9d571572.js",
        revision: "62ffb73f9d571572",
      },
      {
        url: "/_next/static/chunks/54846.043e696e54a398e2.js",
        revision: "043e696e54a398e2",
      },
      {
        url: "/_next/static/chunks/54857.84c76e1e6f971c21.js",
        revision: "84c76e1e6f971c21",
      },
      {
        url: "/_next/static/chunks/55168.11fe658546fcfd27.js",
        revision: "11fe658546fcfd27",
      },
      {
        url: "/_next/static/chunks/55186.cfbdeba1a01859c5.js",
        revision: "cfbdeba1a01859c5",
      },
      {
        url: "/_next/static/chunks/55260.d41232cebabb2f56.js",
        revision: "d41232cebabb2f56",
      },
      {
        url: "/_next/static/chunks/55276.5bb41a6c14a230f0.js",
        revision: "5bb41a6c14a230f0",
      },
      {
        url: "/_next/static/chunks/55364.4b79f9c33c70c25c.js",
        revision: "4b79f9c33c70c25c",
      },
      {
        url: "/_next/static/chunks/55757.8e02c6578b8386a4.js",
        revision: "8e02c6578b8386a4",
      },
      {
        url: "/_next/static/chunks/55811.e52f536a67743281.js",
        revision: "e52f536a67743281",
      },
      {
        url: "/_next/static/chunks/55853.b6dccadd50f95827.js",
        revision: "b6dccadd50f95827",
      },
      {
        url: "/_next/static/chunks/55889.7ab29939de7a6440.js",
        revision: "7ab29939de7a6440",
      },
      {
        url: "/_next/static/chunks/55954.36414646f5bcd498.js",
        revision: "36414646f5bcd498",
      },
      {
        url: "/_next/static/chunks/55988.6979b4efc850f1b3.js",
        revision: "6979b4efc850f1b3",
      },
      {
        url: "/_next/static/chunks/56285.f3e8a5cc135f6daa.js",
        revision: "f3e8a5cc135f6daa",
      },
      {
        url: "/_next/static/chunks/56516.a8f7af727bb384d1.js",
        revision: "a8f7af727bb384d1",
      },
      {
        url: "/_next/static/chunks/56641.d91940723a471cda.js",
        revision: "d91940723a471cda",
      },
      {
        url: "/_next/static/chunks/56676.833484830b05ab5a.js",
        revision: "833484830b05ab5a",
      },
      {
        url: "/_next/static/chunks/56714.fd25f4ea38875235.js",
        revision: "fd25f4ea38875235",
      },
      {
        url: "/_next/static/chunks/56933.cb6742242c01a0c3.js",
        revision: "cb6742242c01a0c3",
      },
      {
        url: "/_next/static/chunks/57154.59aaec66d5994440.js",
        revision: "59aaec66d5994440",
      },
      {
        url: "/_next/static/chunks/57203.6403ad70c41e4fef.js",
        revision: "6403ad70c41e4fef",
      },
      {
        url: "/_next/static/chunks/57454.0af5aa9c6a6030ac.js",
        revision: "0af5aa9c6a6030ac",
      },
      {
        url: "/_next/static/chunks/57780.1f5a2b0baeaad57d.js",
        revision: "1f5a2b0baeaad57d",
      },
      {
        url: "/_next/static/chunks/57867.65c7382891b2edee.js",
        revision: "65c7382891b2edee",
      },
      {
        url: "/_next/static/chunks/58082.d69ce7c2c1b20e2d.js",
        revision: "d69ce7c2c1b20e2d",
      },
      {
        url: "/_next/static/chunks/58151.23b444339d035e46.js",
        revision: "23b444339d035e46",
      },
      {
        url: "/_next/static/chunks/58180.eab2271805afcb82.js",
        revision: "eab2271805afcb82",
      },
      {
        url: "/_next/static/chunks/58314.e7ffb10bda0484f4.js",
        revision: "e7ffb10bda0484f4",
      },
      {
        url: "/_next/static/chunks/58387.8919bbb5f67f5643.js",
        revision: "8919bbb5f67f5643",
      },
      {
        url: "/_next/static/chunks/58528.b2ebdaccc58d927a.js",
        revision: "b2ebdaccc58d927a",
      },
      {
        url: "/_next/static/chunks/58557.521bb528fb1e6538.js",
        revision: "521bb528fb1e6538",
      },
      {
        url: "/_next/static/chunks/5877.ccc1df4a2007d72a.js",
        revision: "ccc1df4a2007d72a",
      },
      {
        url: "/_next/static/chunks/58793.74be911f971df4c6.js",
        revision: "74be911f971df4c6",
      },
      {
        url: "/_next/static/chunks/58798.ecbc2980132d22ad.js",
        revision: "ecbc2980132d22ad",
      },
      {
        url: "/_next/static/chunks/58806.650959d95a8666f9.js",
        revision: "650959d95a8666f9",
      },
      {
        url: "/_next/static/chunks/59263.567ede1368dd12ee.js",
        revision: "567ede1368dd12ee",
      },
      {
        url: "/_next/static/chunks/59375.4076c5138008b900.js",
        revision: "4076c5138008b900",
      },
      {
        url: "/_next/static/chunks/59501.22e06eed555f454e.js",
        revision: "22e06eed555f454e",
      },
      {
        url: "/_next/static/chunks/59773.cc66e51d048fff65.js",
        revision: "cc66e51d048fff65",
      },
      {
        url: "/_next/static/chunks/59998.c960a9e48c20d8cd.js",
        revision: "c960a9e48c20d8cd",
      },
      {
        url: "/_next/static/chunks/60326.cce904ec6e2ad04d.js",
        revision: "cce904ec6e2ad04d",
      },
      {
        url: "/_next/static/chunks/60343.992f86d6dd5cfadb.js",
        revision: "992f86d6dd5cfadb",
      },
      {
        url: "/_next/static/chunks/60385.d0a4e5448bd91334.js",
        revision: "d0a4e5448bd91334",
      },
      {
        url: "/_next/static/chunks/60884.3b62854fa13f6591.js",
        revision: "3b62854fa13f6591",
      },
      {
        url: "/_next/static/chunks/61608.226c4c269b963c32.js",
        revision: "226c4c269b963c32",
      },
      {
        url: "/_next/static/chunks/61944.f86c7df5f2464893.js",
        revision: "f86c7df5f2464893",
      },
      {
        url: "/_next/static/chunks/61992.2d00b064cb9f412b.js",
        revision: "2d00b064cb9f412b",
      },
      {
        url: "/_next/static/chunks/62100.758361becea6794f.js",
        revision: "758361becea6794f",
      },
      {
        url: "/_next/static/chunks/62118.8c66a686e1b8f90e.js",
        revision: "8c66a686e1b8f90e",
      },
      {
        url: "/_next/static/chunks/62130.c3e56602cd70dab8.js",
        revision: "c3e56602cd70dab8",
      },
      {
        url: "/_next/static/chunks/62274.df5a4ebdb77a27ec.js",
        revision: "df5a4ebdb77a27ec",
      },
      {
        url: "/_next/static/chunks/62363.4704b4cee78de443.js",
        revision: "4704b4cee78de443",
      },
      {
        url: "/_next/static/chunks/62373.090c5050745528b5.js",
        revision: "090c5050745528b5",
      },
      {
        url: "/_next/static/chunks/62762.1fec885aab73695a.js",
        revision: "1fec885aab73695a",
      },
      {
        url: "/_next/static/chunks/63056.e53ebaada340d6a2.js",
        revision: "e53ebaada340d6a2",
      },
      {
        url: "/_next/static/chunks/6309.089b7d4c7a1f6b3f.js",
        revision: "089b7d4c7a1f6b3f",
      },
      {
        url: "/_next/static/chunks/63315.75a3c9631c2f2d26.js",
        revision: "75a3c9631c2f2d26",
      },
      {
        url: "/_next/static/chunks/63598.6d345b71e7a41863.js",
        revision: "6d345b71e7a41863",
      },
      {
        url: "/_next/static/chunks/63617.ec7e4fec46e8cb5e.js",
        revision: "ec7e4fec46e8cb5e",
      },
      {
        url: "/_next/static/chunks/63828.35906cb67ae28d6b.js",
        revision: "35906cb67ae28d6b",
      },
      {
        url: "/_next/static/chunks/63960.0a4d7238e9f384bf.js",
        revision: "0a4d7238e9f384bf",
      },
      {
        url: "/_next/static/chunks/64081.0f8d0531a9011bd3.js",
        revision: "0f8d0531a9011bd3",
      },
      {
        url: "/_next/static/chunks/64147.b7f358d7f36b7039.js",
        revision: "b7f358d7f36b7039",
      },
      {
        url: "/_next/static/chunks/64371.1423fb9379985476.js",
        revision: "1423fb9379985476",
      },
      {
        url: "/_next/static/chunks/64402.68840e388c177e27.js",
        revision: "68840e388c177e27",
      },
      {
        url: "/_next/static/chunks/64416.07705b5d4ee36f27.js",
        revision: "07705b5d4ee36f27",
      },
      {
        url: "/_next/static/chunks/6480.30e309f01682d93b.js",
        revision: "30e309f01682d93b",
      },
      {
        url: "/_next/static/chunks/64855.9560d90a3d204ec3.js",
        revision: "9560d90a3d204ec3",
      },
      {
        url: "/_next/static/chunks/64943.1a354262adbf75c5.js",
        revision: "1a354262adbf75c5",
      },
      {
        url: "/_next/static/chunks/65020.ca9a421cc4355b27.js",
        revision: "ca9a421cc4355b27",
      },
      {
        url: "/_next/static/chunks/65688.72cad99951a6064a.js",
        revision: "72cad99951a6064a",
      },
      {
        url: "/_next/static/chunks/65702.8754a54d8d42378b.js",
        revision: "8754a54d8d42378b",
      },
      {
        url: "/_next/static/chunks/65906.5b1d33931b05e7bb.js",
        revision: "5b1d33931b05e7bb",
      },
      {
        url: "/_next/static/chunks/65990.a5f073de92204dbc.js",
        revision: "a5f073de92204dbc",
      },
      {
        url: "/_next/static/chunks/6601.522cbb22a2595eaa.js",
        revision: "522cbb22a2595eaa",
      },
      {
        url: "/_next/static/chunks/6608.68383c18bed294d1.js",
        revision: "68383c18bed294d1",
      },
      {
        url: "/_next/static/chunks/66104.7d06720a61afa762.js",
        revision: "7d06720a61afa762",
      },
      {
        url: "/_next/static/chunks/66132.bb34c6bad02e9b61.js",
        revision: "bb34c6bad02e9b61",
      },
      {
        url: "/_next/static/chunks/66297.c216685923ce7f43.js",
        revision: "c216685923ce7f43",
      },
      {
        url: "/_next/static/chunks/66326.9ce2669538b36c9a.js",
        revision: "9ce2669538b36c9a",
      },
      {
        url: "/_next/static/chunks/66400.3a0ef008a3a26be3.js",
        revision: "3a0ef008a3a26be3",
      },
      {
        url: "/_next/static/chunks/66611.c15571d123abdf71.js",
        revision: "c15571d123abdf71",
      },
      {
        url: "/_next/static/chunks/66697-51cced21ecfb15cf.js",
        revision: "51cced21ecfb15cf",
      },
      {
        url: "/_next/static/chunks/66787.67a60c76ae43f03a.js",
        revision: "67a60c76ae43f03a",
      },
      {
        url: "/_next/static/chunks/66884.1bd2590f174d8e7d.js",
        revision: "1bd2590f174d8e7d",
      },
      {
        url: "/_next/static/chunks/6691.f2a74d895b740954.js",
        revision: "f2a74d895b740954",
      },
      {
        url: "/_next/static/chunks/66911.bb85ff46dd7afe5f.js",
        revision: "bb85ff46dd7afe5f",
      },
      {
        url: "/_next/static/chunks/66926.90886e967d8d6d3e.js",
        revision: "90886e967d8d6d3e",
      },
      {
        url: "/_next/static/chunks/66941.3d4fcfed40d04670.js",
        revision: "3d4fcfed40d04670",
      },
      {
        url: "/_next/static/chunks/66954.ff40fd5c41326dbb.js",
        revision: "ff40fd5c41326dbb",
      },
      {
        url: "/_next/static/chunks/67-85721b76d56f5767.js",
        revision: "85721b76d56f5767",
      },
      {
        url: "/_next/static/chunks/67141.905185ab400960cd.js",
        revision: "905185ab400960cd",
      },
      {
        url: "/_next/static/chunks/67301.36e9aa401c105ff5.js",
        revision: "36e9aa401c105ff5",
      },
      {
        url: "/_next/static/chunks/67407.cb0dee3e70b558a1.js",
        revision: "cb0dee3e70b558a1",
      },
      {
        url: "/_next/static/chunks/67545.bba7f43597e7bb41.js",
        revision: "bba7f43597e7bb41",
      },
      {
        url: "/_next/static/chunks/67556.52dbc1dbb689a098.js",
        revision: "52dbc1dbb689a098",
      },
      {
        url: "/_next/static/chunks/67642.b73f2f9aa3ff2acb.js",
        revision: "b73f2f9aa3ff2acb",
      },
      {
        url: "/_next/static/chunks/67935.e22e86448541ca25.js",
        revision: "e22e86448541ca25",
      },
      {
        url: "/_next/static/chunks/68029.1f32e47881309357.js",
        revision: "1f32e47881309357",
      },
      {
        url: "/_next/static/chunks/68418.8388721d1308d3c9.js",
        revision: "8388721d1308d3c9",
      },
      {
        url: "/_next/static/chunks/68447.001101c0c98c6870.js",
        revision: "001101c0c98c6870",
      },
      {
        url: "/_next/static/chunks/6878.b80f521798c0758f.js",
        revision: "b80f521798c0758f",
      },
      {
        url: "/_next/static/chunks/68886.3a7008d2269c14df.js",
        revision: "3a7008d2269c14df",
      },
      {
        url: "/_next/static/chunks/69045.e90b85339d10221e.js",
        revision: "e90b85339d10221e",
      },
      {
        url: "/_next/static/chunks/6913.5d253dd440573213.js",
        revision: "5d253dd440573213",
      },
      {
        url: "/_next/static/chunks/69230.2bbfe699513e732b.js",
        revision: "2bbfe699513e732b",
      },
      {
        url: "/_next/static/chunks/69462.1135214c07ff1cc6.js",
        revision: "1135214c07ff1cc6",
      },
      {
        url: "/_next/static/chunks/69594.294de14da271f369.js",
        revision: "294de14da271f369",
      },
      {
        url: "/_next/static/chunks/6964.c0040b2fb99dc2a2.js",
        revision: "c0040b2fb99dc2a2",
      },
      {
        url: "/_next/static/chunks/69698.81287a9b38d65e93.js",
        revision: "81287a9b38d65e93",
      },
      {
        url: "/_next/static/chunks/69706.86255e90268a1db8.js",
        revision: "86255e90268a1db8",
      },
      {
        url: "/_next/static/chunks/69787.df70c8f2234c8465.js",
        revision: "df70c8f2234c8465",
      },
      {
        url: "/_next/static/chunks/69987.b970a3a2955ee559.js",
        revision: "b970a3a2955ee559",
      },
      {
        url: "/_next/static/chunks/70148.c5791e1fca8046df.js",
        revision: "c5791e1fca8046df",
      },
      {
        url: "/_next/static/chunks/70190.278aad18a1a89935.js",
        revision: "278aad18a1a89935",
      },
      {
        url: "/_next/static/chunks/70410.4eccbbb25b892e8e.js",
        revision: "4eccbbb25b892e8e",
      },
      {
        url: "/_next/static/chunks/7049.c24aa18267f264d2.js",
        revision: "c24aa18267f264d2",
      },
      {
        url: "/_next/static/chunks/70627.5508ce1040816d1e.js",
        revision: "5508ce1040816d1e",
      },
      {
        url: "/_next/static/chunks/7090.a494040ed7497950.js",
        revision: "a494040ed7497950",
      },
      {
        url: "/_next/static/chunks/71081.e14bc097558e66e9.js",
        revision: "e14bc097558e66e9",
      },
      {
        url: "/_next/static/chunks/71684.975e97a5e2d74f5d.js",
        revision: "975e97a5e2d74f5d",
      },
      {
        url: "/_next/static/chunks/72420.c3a6c47de358dbc1.js",
        revision: "c3a6c47de358dbc1",
      },
      {
        url: "/_next/static/chunks/72521.5cdd629c10b44756.js",
        revision: "5cdd629c10b44756",
      },
      {
        url: "/_next/static/chunks/72558.957060a49a1b1fa1.js",
        revision: "957060a49a1b1fa1",
      },
      {
        url: "/_next/static/chunks/72591.4a325a4b8987b198.js",
        revision: "4a325a4b8987b198",
      },
      {
        url: "/_next/static/chunks/72692.b76002b1423a8099.js",
        revision: "b76002b1423a8099",
      },
      {
        url: "/_next/static/chunks/72740.f243c685aa8c3fb9.js",
        revision: "f243c685aa8c3fb9",
      },
      {
        url: "/_next/static/chunks/72950.9beadf0d3ca1bdb1.js",
        revision: "9beadf0d3ca1bdb1",
      },
      {
        url: "/_next/static/chunks/732.ab0e1c34cf770bb1.js",
        revision: "ab0e1c34cf770bb1",
      },
      {
        url: "/_next/static/chunks/73221.2565c70872948f42.js",
        revision: "2565c70872948f42",
      },
      {
        url: "/_next/static/chunks/73243.99756e17843e87e4.js",
        revision: "99756e17843e87e4",
      },
      {
        url: "/_next/static/chunks/73380.5cc7857825237838.js",
        revision: "5cc7857825237838",
      },
      {
        url: "/_next/static/chunks/73431.6ed3ba5419e78ffc.js",
        revision: "6ed3ba5419e78ffc",
      },
      {
        url: "/_next/static/chunks/73480.862e884bdf3f193b.js",
        revision: "862e884bdf3f193b",
      },
      {
        url: "/_next/static/chunks/73622.803d4a710fb67925.js",
        revision: "803d4a710fb67925",
      },
      {
        url: "/_next/static/chunks/73678.3c440f3587f1b22d.js",
        revision: "3c440f3587f1b22d",
      },
      {
        url: "/_next/static/chunks/73814.9991bfc31db87763.js",
        revision: "9991bfc31db87763",
      },
      {
        url: "/_next/static/chunks/73837-565772a9c3a563d8.js",
        revision: "565772a9c3a563d8",
      },
      {
        url: "/_next/static/chunks/73953.173245136f359549.js",
        revision: "173245136f359549",
      },
      {
        url: "/_next/static/chunks/74058.0d95474a22cad44d.js",
        revision: "0d95474a22cad44d",
      },
      {
        url: "/_next/static/chunks/74166.f71fe9e08d523b1c.js",
        revision: "f71fe9e08d523b1c",
      },
      {
        url: "/_next/static/chunks/74193.36c044213d6a3d71.js",
        revision: "36c044213d6a3d71",
      },
      {
        url: "/_next/static/chunks/74241.da81f64a196855a9.js",
        revision: "da81f64a196855a9",
      },
      {
        url: "/_next/static/chunks/74331.09b8e6cd17fffd2d.js",
        revision: "09b8e6cd17fffd2d",
      },
      {
        url: "/_next/static/chunks/74455.f2c8314bd040cf84.js",
        revision: "f2c8314bd040cf84",
      },
      {
        url: "/_next/static/chunks/74868.2bc578fa1b96679a.js",
        revision: "2bc578fa1b96679a",
      },
      {
        url: "/_next/static/chunks/7500.fdbc33e3547fe312.js",
        revision: "fdbc33e3547fe312",
      },
      {
        url: "/_next/static/chunks/75539.f6d96183ead90257.js",
        revision: "f6d96183ead90257",
      },
      {
        url: "/_next/static/chunks/75592.f07376193c8e199c.js",
        revision: "f07376193c8e199c",
      },
      {
        url: "/_next/static/chunks/75632.9c74569c5fc69e53.js",
        revision: "9c74569c5fc69e53",
      },
      {
        url: "/_next/static/chunks/75755.4255fb492a2f30de.js",
        revision: "4255fb492a2f30de",
      },
      {
        url: "/_next/static/chunks/75861.dad71bd8c9a8a091.js",
        revision: "dad71bd8c9a8a091",
      },
      {
        url: "/_next/static/chunks/76068.709c9e63bf214085.js",
        revision: "709c9e63bf214085",
      },
      {
        url: "/_next/static/chunks/76544.ec898349606c07e8.js",
        revision: "ec898349606c07e8",
      },
      {
        url: "/_next/static/chunks/76547.bfd1fe87e521a79b.js",
        revision: "bfd1fe87e521a79b",
      },
      {
        url: "/_next/static/chunks/76905.d520244d9e675a9e.js",
        revision: "d520244d9e675a9e",
      },
      {
        url: "/_next/static/chunks/77079.e1048a1edb2eb0b9.js",
        revision: "e1048a1edb2eb0b9",
      },
      {
        url: "/_next/static/chunks/77204.fe7a5111fae14b18.js",
        revision: "fe7a5111fae14b18",
      },
      {
        url: "/_next/static/chunks/77286.69ae79aac6a510a3.js",
        revision: "69ae79aac6a510a3",
      },
      {
        url: "/_next/static/chunks/77421.1774804d8ae2dc06.js",
        revision: "1774804d8ae2dc06",
      },
      {
        url: "/_next/static/chunks/77675.17ebc4cf4fdf7e54.js",
        revision: "17ebc4cf4fdf7e54",
      },
      {
        url: "/_next/static/chunks/77758.041b1d2283541848.js",
        revision: "041b1d2283541848",
      },
      {
        url: "/_next/static/chunks/77822.c44a16a4634cd0de.js",
        revision: "c44a16a4634cd0de",
      },
      {
        url: "/_next/static/chunks/77959.fb9a0b1bf979bb4f.js",
        revision: "fb9a0b1bf979bb4f",
      },
      {
        url: "/_next/static/chunks/77966.e096b95b847afa5f.js",
        revision: "e096b95b847afa5f",
      },
      {
        url: "/_next/static/chunks/77975.a1a6d379a16f8f93.js",
        revision: "a1a6d379a16f8f93",
      },
      {
        url: "/_next/static/chunks/78077.cef15fa9340e44a9.js",
        revision: "cef15fa9340e44a9",
      },
      {
        url: "/_next/static/chunks/78146.ea045c304be3f782.js",
        revision: "ea045c304be3f782",
      },
      {
        url: "/_next/static/chunks/78287.362f52ae234f97ef.js",
        revision: "362f52ae234f97ef",
      },
      {
        url: "/_next/static/chunks/78293.554bb9830303c7bb.js",
        revision: "554bb9830303c7bb",
      },
      {
        url: "/_next/static/chunks/78398.3fb2065d90b3a246.js",
        revision: "3fb2065d90b3a246",
      },
      {
        url: "/_next/static/chunks/78593.7624b154e1f4d0e7.js",
        revision: "7624b154e1f4d0e7",
      },
      {
        url: "/_next/static/chunks/78623.9d106ee4a7848800.js",
        revision: "9d106ee4a7848800",
      },
      {
        url: "/_next/static/chunks/79291.d7d908eb4d605f88.js",
        revision: "d7d908eb4d605f88",
      },
      {
        url: "/_next/static/chunks/79388.bd7c0394ebb35aa8.js",
        revision: "bd7c0394ebb35aa8",
      },
      {
        url: "/_next/static/chunks/79635-ce22f14d2cb9c585.js",
        revision: "ce22f14d2cb9c585",
      },
      {
        url: "/_next/static/chunks/79723.4bd0dd19eb332324.js",
        revision: "4bd0dd19eb332324",
      },
      {
        url: "/_next/static/chunks/7dccf9e0-02b1d90349f0306c.js",
        revision: "02b1d90349f0306c",
      },
      {
        url: "/_next/static/chunks/80064.92ae5df4959e45d1.js",
        revision: "92ae5df4959e45d1",
      },
      {
        url: "/_next/static/chunks/8007.281e99de2c82aeca.js",
        revision: "281e99de2c82aeca",
      },
      {
        url: "/_next/static/chunks/80071.58250029630718f5.js",
        revision: "58250029630718f5",
      },
      {
        url: "/_next/static/chunks/80115.ed2b17d528419072.js",
        revision: "ed2b17d528419072",
      },
      {
        url: "/_next/static/chunks/80138.073753313ed2a943.js",
        revision: "073753313ed2a943",
      },
      {
        url: "/_next/static/chunks/8050.7f82e0221f27ffaf.js",
        revision: "7f82e0221f27ffaf",
      },
      {
        url: "/_next/static/chunks/80823.4ee6093cd0326bb0.js",
        revision: "4ee6093cd0326bb0",
      },
      {
        url: "/_next/static/chunks/80967.9e3e571167061691.js",
        revision: "9e3e571167061691",
      },
      {
        url: "/_next/static/chunks/81007.ff04a023b4bba9d4.js",
        revision: "ff04a023b4bba9d4",
      },
      {
        url: "/_next/static/chunks/81258.678174d1f0ebeca4.js",
        revision: "678174d1f0ebeca4",
      },
      {
        url: "/_next/static/chunks/81281.6287adcf50e53a84.js",
        revision: "6287adcf50e53a84",
      },
      {
        url: "/_next/static/chunks/81578.5e94a5d6de835c99.js",
        revision: "5e94a5d6de835c99",
      },
      {
        url: "/_next/static/chunks/81714.8eaf316eca244d04.js",
        revision: "8eaf316eca244d04",
      },
      {
        url: "/_next/static/chunks/82115.e655519bdcb51342.js",
        revision: "e655519bdcb51342",
      },
      {
        url: "/_next/static/chunks/82153.930ae110c04078af.js",
        revision: "930ae110c04078af",
      },
      {
        url: "/_next/static/chunks/82247.c8dfd12bb637dcbf.js",
        revision: "c8dfd12bb637dcbf",
      },
      {
        url: "/_next/static/chunks/82326.4ada79c16ab97146.js",
        revision: "4ada79c16ab97146",
      },
      {
        url: "/_next/static/chunks/82620.83e84b429f8f2e95.js",
        revision: "83e84b429f8f2e95",
      },
      {
        url: "/_next/static/chunks/82746.02c034074d48265e.js",
        revision: "02c034074d48265e",
      },
      {
        url: "/_next/static/chunks/82805.1600ab64af33e929.js",
        revision: "1600ab64af33e929",
      },
      {
        url: "/_next/static/chunks/82807.96b4cccb2a1f9ea2.js",
        revision: "96b4cccb2a1f9ea2",
      },
      {
        url: "/_next/static/chunks/82893.9af2466500b320fb.js",
        revision: "9af2466500b320fb",
      },
      {
        url: "/_next/static/chunks/83165.628916d69b0a935a.js",
        revision: "628916d69b0a935a",
      },
      {
        url: "/_next/static/chunks/8344.d1ca5254380322aa.js",
        revision: "d1ca5254380322aa",
      },
      {
        url: "/_next/static/chunks/8363.2a4d80729a320b8c.js",
        revision: "2a4d80729a320b8c",
      },
      {
        url: "/_next/static/chunks/83698.5ba5a882d9890ea0.js",
        revision: "5ba5a882d9890ea0",
      },
      {
        url: "/_next/static/chunks/83719.fe31bb605aa352f5.js",
        revision: "fe31bb605aa352f5",
      },
      {
        url: "/_next/static/chunks/83797.c4a87f63c94c4275.js",
        revision: "c4a87f63c94c4275",
      },
      {
        url: "/_next/static/chunks/83869.000a8e3d216795a4.js",
        revision: "000a8e3d216795a4",
      },
      {
        url: "/_next/static/chunks/84177.b282dc6483c2c727.js",
        revision: "b282dc6483c2c727",
      },
      {
        url: "/_next/static/chunks/84276.6b8ffa793c827440.js",
        revision: "6b8ffa793c827440",
      },
      {
        url: "/_next/static/chunks/84295.3cad3ac3b85d89f5.js",
        revision: "3cad3ac3b85d89f5",
      },
      {
        url: "/_next/static/chunks/84339.e325cba1d2da94ab.js",
        revision: "e325cba1d2da94ab",
      },
      {
        url: "/_next/static/chunks/84463.2bfc65803c5b8b49.js",
        revision: "2bfc65803c5b8b49",
      },
      {
        url: "/_next/static/chunks/84687.86e1fcc216732201.js",
        revision: "86e1fcc216732201",
      },
      {
        url: "/_next/static/chunks/84709.19868577d1a6a6c7.js",
        revision: "19868577d1a6a6c7",
      },
      {
        url: "/_next/static/chunks/84828.0fd70f88c25c3086.js",
        revision: "0fd70f88c25c3086",
      },
      {
        url: "/_next/static/chunks/85129.659e770616adf810.js",
        revision: "659e770616adf810",
      },
      {
        url: "/_next/static/chunks/85139.6d58d074de87ff22.js",
        revision: "6d58d074de87ff22",
      },
      {
        url: "/_next/static/chunks/85269.c3da8915a68d76d0.js",
        revision: "c3da8915a68d76d0",
      },
      {
        url: "/_next/static/chunks/85478.f0a5fdf539bdda4b.js",
        revision: "f0a5fdf539bdda4b",
      },
      {
        url: "/_next/static/chunks/85598.d6babb42dd3c31e2.js",
        revision: "d6babb42dd3c31e2",
      },
      {
        url: "/_next/static/chunks/85599.831e7ea8768d5951.js",
        revision: "831e7ea8768d5951",
      },
      {
        url: "/_next/static/chunks/85728.9103b0afc833eb62.js",
        revision: "9103b0afc833eb62",
      },
      {
        url: "/_next/static/chunks/85959.1cdc736cea19d459.js",
        revision: "1cdc736cea19d459",
      },
      {
        url: "/_next/static/chunks/86086.7a82e54b0bbe0140.js",
        revision: "7a82e54b0bbe0140",
      },
      {
        url: "/_next/static/chunks/86097.b6afac4f9f55749f.js",
        revision: "b6afac4f9f55749f",
      },
      {
        url: "/_next/static/chunks/86137.54c32de7b0f45ea3.js",
        revision: "54c32de7b0f45ea3",
      },
      {
        url: "/_next/static/chunks/86276.939d5bd0f0557962.js",
        revision: "939d5bd0f0557962",
      },
      {
        url: "/_next/static/chunks/86504.a6cf8b0aeb09ab99.js",
        revision: "a6cf8b0aeb09ab99",
      },
      {
        url: "/_next/static/chunks/86905.1e9d6ee4f508805d.js",
        revision: "1e9d6ee4f508805d",
      },
      {
        url: "/_next/static/chunks/87629.2623e6038a82affe.js",
        revision: "2623e6038a82affe",
      },
      {
        url: "/_next/static/chunks/87931.3127f08609caa07c.js",
        revision: "3127f08609caa07c",
      },
      {
        url: "/_next/static/chunks/88027.008f645484a4a43b.js",
        revision: "008f645484a4a43b",
      },
      {
        url: "/_next/static/chunks/88114.ab61887cce2cf0f9.js",
        revision: "ab61887cce2cf0f9",
      },
      {
        url: "/_next/static/chunks/88150.6e603562f43c4b68.js",
        revision: "6e603562f43c4b68",
      },
      {
        url: "/_next/static/chunks/88187.fc06c0774141a6b9.js",
        revision: "fc06c0774141a6b9",
      },
      {
        url: "/_next/static/chunks/88297.f09825c02c2f3ff5.js",
        revision: "f09825c02c2f3ff5",
      },
      {
        url: "/_next/static/chunks/88321.66d668f8b420b486.js",
        revision: "66d668f8b420b486",
      },
      {
        url: "/_next/static/chunks/8857-4e9af4c7f190878d.js",
        revision: "4e9af4c7f190878d",
      },
      {
        url: "/_next/static/chunks/8871.947d9fa4c8713bd7.js",
        revision: "947d9fa4c8713bd7",
      },
      {
        url: "/_next/static/chunks/88770.fc770f73cceb0430.js",
        revision: "fc770f73cceb0430",
      },
      {
        url: "/_next/static/chunks/88905.33c5b03975d0c73b.js",
        revision: "33c5b03975d0c73b",
      },
      {
        url: "/_next/static/chunks/89246.a294bd81c3799cab.js",
        revision: "a294bd81c3799cab",
      },
      {
        url: "/_next/static/chunks/89617.7cc72c35b20f4cf3.js",
        revision: "7cc72c35b20f4cf3",
      },
      {
        url: "/_next/static/chunks/89619.febfab95995be145.js",
        revision: "febfab95995be145",
      },
      {
        url: "/_next/static/chunks/89620.68355b9552ec1021.js",
        revision: "68355b9552ec1021",
      },
      {
        url: "/_next/static/chunks/89674.43bef973f112f96d.js",
        revision: "43bef973f112f96d",
      },
      {
        url: "/_next/static/chunks/89731.4ede37c207183522.js",
        revision: "4ede37c207183522",
      },
      {
        url: "/_next/static/chunks/90072.9c4d7887b89c9adf.js",
        revision: "9c4d7887b89c9adf",
      },
      {
        url: "/_next/static/chunks/90580.52b96ea012f93ed2.js",
        revision: "52b96ea012f93ed2",
      },
      {
        url: "/_next/static/chunks/90905.fd621cd1ad37348a.js",
        revision: "fd621cd1ad37348a",
      },
      {
        url: "/_next/static/chunks/90923.d601ba6034df27e7.js",
        revision: "d601ba6034df27e7",
      },
      {
        url: "/_next/static/chunks/91101.3b751c42b853daf7.js",
        revision: "3b751c42b853daf7",
      },
      {
        url: "/_next/static/chunks/91206.b57ac9798c01cc05.js",
        revision: "b57ac9798c01cc05",
      },
      {
        url: "/_next/static/chunks/91219.e00358f6e77fa573.js",
        revision: "e00358f6e77fa573",
      },
      {
        url: "/_next/static/chunks/91400.84adcd43d3e9370c.js",
        revision: "84adcd43d3e9370c",
      },
      {
        url: "/_next/static/chunks/91503.8569a5fbd9a981e6.js",
        revision: "8569a5fbd9a981e6",
      },
      {
        url: "/_next/static/chunks/91599.7d321f71f6413d34.js",
        revision: "7d321f71f6413d34",
      },
      {
        url: "/_next/static/chunks/91625.a57edc0696f8d79d.js",
        revision: "a57edc0696f8d79d",
      },
      {
        url: "/_next/static/chunks/91693.3e5600a82e8f8672.js",
        revision: "3e5600a82e8f8672",
      },
      {
        url: "/_next/static/chunks/91753.439ba5a93641bdc9.js",
        revision: "439ba5a93641bdc9",
      },
      {
        url: "/_next/static/chunks/92202.a04739e143511ad5.js",
        revision: "a04739e143511ad5",
      },
      {
        url: "/_next/static/chunks/92254.852f004b023e03fa.js",
        revision: "852f004b023e03fa",
      },
      {
        url: "/_next/static/chunks/92623.a0acacaeae433cd4.js",
        revision: "a0acacaeae433cd4",
      },
      {
        url: "/_next/static/chunks/92759.aa175e95194744ea.js",
        revision: "aa175e95194744ea",
      },
      {
        url: "/_next/static/chunks/93205.a8ac7207feb8bd6d.js",
        revision: "a8ac7207feb8bd6d",
      },
      {
        url: "/_next/static/chunks/9329.329ebad18bb5b9d9.js",
        revision: "329ebad18bb5b9d9",
      },
      {
        url: "/_next/static/chunks/93372.e3d9dbfe218bea64.js",
        revision: "e3d9dbfe218bea64",
      },
      {
        url: "/_next/static/chunks/93677.fca2eb42650167e9.js",
        revision: "fca2eb42650167e9",
      },
      {
        url: "/_next/static/chunks/93962.47ec6f0f3d9cd416.js",
        revision: "47ec6f0f3d9cd416",
      },
      {
        url: "/_next/static/chunks/94095.7dbded4a77eb6f67.js",
        revision: "7dbded4a77eb6f67",
      },
      {
        url: "/_next/static/chunks/94112.7a5d3be3e931d070.js",
        revision: "7a5d3be3e931d070",
      },
      {
        url: "/_next/static/chunks/94148.943e8a7443fd6591.js",
        revision: "943e8a7443fd6591",
      },
      {
        url: "/_next/static/chunks/9415.c057a7f94008d4db.js",
        revision: "c057a7f94008d4db",
      },
      {
        url: "/_next/static/chunks/94582.38b894b5695fc5a0.js",
        revision: "38b894b5695fc5a0",
      },
      {
        url: "/_next/static/chunks/94786.c92f6a42c1475e1b.js",
        revision: "c92f6a42c1475e1b",
      },
      {
        url: "/_next/static/chunks/94928.a4bea98de0e63628.js",
        revision: "a4bea98de0e63628",
      },
      {
        url: "/_next/static/chunks/94931.a9a60d3b8c621f8f.js",
        revision: "a9a60d3b8c621f8f",
      },
      {
        url: "/_next/static/chunks/95044.46e36f7e5ed4bee4.js",
        revision: "46e36f7e5ed4bee4",
      },
      {
        url: "/_next/static/chunks/95058.bf3572cfc8004ef6.js",
        revision: "bf3572cfc8004ef6",
      },
      {
        url: "/_next/static/chunks/95160.1f9a95121f6709c2.js",
        revision: "1f9a95121f6709c2",
      },
      {
        url: "/_next/static/chunks/95247.35cf0c8da5d963ea.js",
        revision: "35cf0c8da5d963ea",
      },
      {
        url: "/_next/static/chunks/95433.f93269d690949ed4.js",
        revision: "f93269d690949ed4",
      },
      {
        url: "/_next/static/chunks/95525.6278fec9d4e055a8.js",
        revision: "6278fec9d4e055a8",
      },
      {
        url: "/_next/static/chunks/95792.fdcc3a24b1764114.js",
        revision: "fdcc3a24b1764114",
      },
      {
        url: "/_next/static/chunks/96157.543bf9de8acf21a2.js",
        revision: "543bf9de8acf21a2",
      },
      {
        url: "/_next/static/chunks/96403.62dc3cb872981a6c.js",
        revision: "62dc3cb872981a6c",
      },
      {
        url: "/_next/static/chunks/96500.166ddb276793412e.js",
        revision: "166ddb276793412e",
      },
      {
        url: "/_next/static/chunks/9659.429af380f6994d52.js",
        revision: "429af380f6994d52",
      },
      {
        url: "/_next/static/chunks/96653.5d786f2e0df15358.js",
        revision: "5d786f2e0df15358",
      },
      {
        url: "/_next/static/chunks/96868.99e316f3e3506d51.js",
        revision: "99e316f3e3506d51",
      },
      {
        url: "/_next/static/chunks/96944.dbf76fc50bd91c14.js",
        revision: "dbf76fc50bd91c14",
      },
      {
        url: "/_next/static/chunks/97200.42c7034f7c57b800.js",
        revision: "42c7034f7c57b800",
      },
      {
        url: "/_next/static/chunks/97244.f4128ffed59d8e16.js",
        revision: "f4128ffed59d8e16",
      },
      {
        url: "/_next/static/chunks/97253.237654cb9a2ad774.js",
        revision: "237654cb9a2ad774",
      },
      {
        url: "/_next/static/chunks/97264.c3265e91804de041.js",
        revision: "c3265e91804de041",
      },
      {
        url: "/_next/static/chunks/97413.8a9bc03f0e630134.js",
        revision: "8a9bc03f0e630134",
      },
      {
        url: "/_next/static/chunks/97623.57007cf8e8622d57.js",
        revision: "57007cf8e8622d57",
      },
      {
        url: "/_next/static/chunks/97664.72516dcfb63bd1d4.js",
        revision: "72516dcfb63bd1d4",
      },
      {
        url: "/_next/static/chunks/97709.5ff58c420f362fa7.js",
        revision: "5ff58c420f362fa7",
      },
      {
        url: "/_next/static/chunks/98151.71584c10c74cc26c.js",
        revision: "71584c10c74cc26c",
      },
      {
        url: "/_next/static/chunks/98239.e7784546427f795a.js",
        revision: "e7784546427f795a",
      },
      {
        url: "/_next/static/chunks/98266.d672efcb93317b37.js",
        revision: "d672efcb93317b37",
      },
      {
        url: "/_next/static/chunks/98310.7bdea1794ee3b833.js",
        revision: "7bdea1794ee3b833",
      },
      {
        url: "/_next/static/chunks/98405.a15f7953e99b13e5.js",
        revision: "a15f7953e99b13e5",
      },
      {
        url: "/_next/static/chunks/99160.00761dcb2366a5c7.js",
        revision: "00761dcb2366a5c7",
      },
      {
        url: "/_next/static/chunks/9922.9160cf649c1ff82d.js",
        revision: "9160cf649c1ff82d",
      },
      {
        url: "/_next/static/chunks/99252.cdd1ba5734b587e0.js",
        revision: "cdd1ba5734b587e0",
      },
      {
        url: "/_next/static/chunks/99813-33f9365309d8978a.js",
        revision: "33f9365309d8978a",
      },
      {
        url: "/_next/static/chunks/99867.554e78853ed00ec6.js",
        revision: "554e78853ed00ec6",
      },
      {
        url: "/_next/static/chunks/99931.2199eda93d698ea0.js",
        revision: "2199eda93d698ea0",
      },
      {
        url: "/_next/static/chunks/9d78c252-a0ab7b63bf01402b.js",
        revision: "a0ab7b63bf01402b",
      },
      {
        url: "/_next/static/chunks/a9f06191-5ff5b7fe5384064b.js",
        revision: "5ff5b7fe5384064b",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/account/page-8176d2e63cc4af73.js",
        revision: "8176d2e63cc4af73",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/fund/page-6af8eb1bd23f7584.js",
        revision: "6af8eb1bd23f7584",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/home/page-597a24131f378d33.js",
        revision: "597a24131f378d33",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/mentorship/page-6ed02b691a24be2a.js",
        revision: "6ed02b691a24be2a",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/overview/page-cf8cc0399def07f9.js",
        revision: "cf8cc0399def07f9",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/signals/page-2ee6cf68d9ecd517.js",
        revision: "2ee6cf68d9ecd517",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/trade/page-c6fb9e76a5637f8f.js",
        revision: "c6fb9e76a5637f8f",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/(tabs)/watchlist/page-f5482ea8c42f144a.js",
        revision: "f5482ea8c42f144a",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/layout-ab1a78cef8c9035e.js",
        revision: "ab1a78cef8c9035e",
      },
      {
        url:
          "/_next/static/chunks/app/(miniapp)/miniapp/page-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/_not-found/page-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/about/page-c722c50424e4afa1.js",
        revision: "c722c50424e4afa1",
      },
      {
        url: "/_next/static/chunks/app/admin/page-9775a32f65b0e0e5.js",
        revision: "9775a32f65b0e0e5",
      },
      {
        url:
          "/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/api/dynamic-ai/chat/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/api/dynamic-rest/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/api/health/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/api/hello/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/api/metrics/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/api/og/generate/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/api/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/api/tools/multi-llm/chat/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/api/tools/multi-llm/providers/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/api/tools/trade-journal/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url:
          "/_next/static/chunks/app/blog/%5Bslug%5D/page-5a74f6091f68439b.js",
        revision: "5a74f6091f68439b",
      },
      {
        url: "/_next/static/chunks/app/blog/page-d5a9ec654eb4bcad.js",
        revision: "d5a9ec654eb4bcad",
      },
      {
        url: "/_next/static/chunks/app/checkout/page-1a5bdf0c2aabefff.js",
        revision: "1a5bdf0c2aabefff",
      },
      {
        url: "/_next/static/chunks/app/error-db8d4cf856e212a0.js",
        revision: "db8d4cf856e212a0",
      },
      {
        url: "/_next/static/chunks/app/gallery/page-2a0a93974b559384.js",
        revision: "2a0a93974b559384",
      },
      {
        url: "/_next/static/chunks/app/global-error-b47acd86c385e1c5.js",
        revision: "b47acd86c385e1c5",
      },
      {
        url: "/_next/static/chunks/app/healthz/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/investor/page-f922872803c71cf3.js",
        revision: "f922872803c71cf3",
      },
      {
        url: "/_next/static/chunks/app/layout-6add9a5ad3e43da4.js",
        revision: "6add9a5ad3e43da4",
      },
      {
        url: "/_next/static/chunks/app/login/page-9937197d62c1cf16.js",
        revision: "9937197d62c1cf16",
      },
      {
        url: "/_next/static/chunks/app/not-found-da462e697b64d36d.js",
        revision: "da462e697b64d36d",
      },
      {
        url: "/_next/static/chunks/app/page-fd53cbaff734428f.js",
        revision: "fd53cbaff734428f",
      },
      {
        url: "/_next/static/chunks/app/payment-status/page-5708c74b1fe3d6a7.js",
        revision: "5708c74b1fe3d6a7",
      },
      {
        url: "/_next/static/chunks/app/plans/page-9f1104b729d5941c.js",
        revision: "9f1104b729d5941c",
      },
      {
        url: "/_next/static/chunks/app/school/page-9324aeaaa09ba0c7.js",
        revision: "9324aeaaa09ba0c7",
      },
      {
        url: "/_next/static/chunks/app/signal/route-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/styles/page-314e8536384a42cf.js",
        revision: "314e8536384a42cf",
      },
      {
        url: "/_next/static/chunks/app/support/page-ef7ae4c79d90d4eb.js",
        revision: "ef7ae4c79d90d4eb",
      },
      {
        url: "/_next/static/chunks/app/telegram/page-52439e9b0f9a02c8.js",
        revision: "52439e9b0f9a02c8",
      },
      {
        url: "/_next/static/chunks/app/token/page-591691cfd1cb9c95.js",
        revision: "591691cfd1cb9c95",
      },
      {
        url:
          "/_next/static/chunks/app/tools/dynamic-market-review/page-604062bc3a124ef9.js",
        revision: "604062bc3a124ef9",
      },
      {
        url:
          "/_next/static/chunks/app/tools/dynamic-portfolio/page-50f85b7bbc7f7ad8.js",
        revision: "50f85b7bbc7f7ad8",
      },
      {
        url:
          "/_next/static/chunks/app/tools/dynamic-ui-optimizer/page-b74e8fe1df84f23e.js",
        revision: "b74e8fe1df84f23e",
      },
      {
        url:
          "/_next/static/chunks/app/tools/dynamic-visual/page-dfb6ef672098837b.js",
        revision: "dfb6ef672098837b",
      },
      {
        url: "/_next/static/chunks/app/tools/heatmap/page-602706c729f1b981.js",
        revision: "602706c729f1b981",
      },
      {
        url:
          "/_next/static/chunks/app/tools/multi-llm/page-4867eb44f0c3a6bb.js",
        revision: "4867eb44f0c3a6bb",
      },
      {
        url:
          "/_next/static/chunks/app/tools/trade-journal/page-47bb2f75c9890c0e.js",
        revision: "47bb2f75c9890c0e",
      },
      {
        url: "/_next/static/chunks/app/ui/sandbox/page-eb5b2ae3aa2209f9.js",
        revision: "eb5b2ae3aa2209f9",
      },
      {
        url: "/_next/static/chunks/app/wallet/page-591691cfd1cb9c95.js",
        revision: "591691cfd1cb9c95",
      },
      {
        url:
          "/_next/static/chunks/app/work/%5Bslug%5D/page-90812dd4db4666ac.js",
        revision: "90812dd4db4666ac",
      },
      {
        url: "/_next/static/chunks/app/work/page-f816b1752f7485e2.js",
        revision: "f816b1752f7485e2",
      },
      {
        url: "/_next/static/chunks/b6ff252e-598dda54f616c1b6.js",
        revision: "598dda54f616c1b6",
      },
      {
        url: "/_next/static/chunks/dccfb526-aadf6b32fc6cdfe8.js",
        revision: "aadf6b32fc6cdfe8",
      },
      {
        url: "/_next/static/chunks/f245bf5a-ceaf8ad15ae1ca6a.js",
        revision: "ceaf8ad15ae1ca6a",
      },
      {
        url: "/_next/static/chunks/framework-d677fc9448d3a647.js",
        revision: "d677fc9448d3a647",
      },
      {
        url: "/_next/static/chunks/main-app-3bacab3993ea6c84.js",
        revision: "3bacab3993ea6c84",
      },
      {
        url: "/_next/static/chunks/main-c6d097b92cb0d9a8.js",
        revision: "c6d097b92cb0d9a8",
      },
      {
        url: "/_next/static/chunks/pages/_app-f365312a4d2529fb.js",
        revision: "f365312a4d2529fb",
      },
      {
        url: "/_next/static/chunks/pages/_error-ff431fa75c297bd3.js",
        revision: "ff431fa75c297bd3",
      },
      {
        url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
        revision: "846118c33b2c0e922d7b3a7676f81f6f",
      },
      {
        url: "/_next/static/chunks/webpack-e4f9730b73feb7d1.js",
        revision: "e4f9730b73feb7d1",
      },
      {
        url: "/_next/static/css/0f6d6d27eab36d39.css",
        revision: "0f6d6d27eab36d39",
      },
      {
        url: "/_next/static/css/10710425e951a78c.css",
        revision: "10710425e951a78c",
      },
      {
        url: "/_next/static/css/24c8f17721615f30.css",
        revision: "24c8f17721615f30",
      },
      {
        url: "/_next/static/css/48bd69ce008ded7e.css",
        revision: "48bd69ce008ded7e",
      },
      {
        url: "/_next/static/css/50b873e9b0e9228d.css",
        revision: "50b873e9b0e9228d",
      },
      {
        url: "/_next/static/css/58a847211654da31.css",
        revision: "58a847211654da31",
      },
      {
        url: "/_next/static/css/5bd028f3fb2d6a76.css",
        revision: "5bd028f3fb2d6a76",
      },
      {
        url: "/_next/static/css/6efb06a745c0cc7a.css",
        revision: "6efb06a745c0cc7a",
      },
      {
        url: "/_next/static/css/73c57e56bebfb28a.css",
        revision: "73c57e56bebfb28a",
      },
      {
        url: "/_next/static/css/7f315ce2dfff6839.css",
        revision: "7f315ce2dfff6839",
      },
      {
        url: "/_next/static/css/895bb507df5483c4.css",
        revision: "895bb507df5483c4",
      },
      {
        url: "/_next/static/css/9258a277afeb7c87.css",
        revision: "9258a277afeb7c87",
      },
      {
        url: "/_next/static/css/b8253a016fa8f45a.css",
        revision: "b8253a016fa8f45a",
      },
      {
        url: "/_next/static/css/f60347693153100a.css",
        revision: "f60347693153100a",
      },
      {
        url: "/_next/static/media/4cf2300e9c8272f7-s.p.woff2",
        revision: "18bae71b1e1b2bb25321090a3b563103",
      },
      {
        url: "/_next/static/media/747892c23ea88013-s.woff2",
        revision: "a0761690ccf4441ace5cec893b82d4ab",
      },
      {
        url: "/_next/static/media/8d697b304b401681-s.woff2",
        revision: "cc728f6c0adb04da0dfcb0fc436a8ae5",
      },
      {
        url: "/_next/static/media/93f479601ee12b01-s.p.woff2",
        revision: "da83d5f06d825c5ae65b7cca706cb312",
      },
      {
        url: "/_next/static/media/9610d9e46709d722-s.woff2",
        revision: "7b7c0ef93df188a852344fc272fc096b",
      },
      {
        url: "/_next/static/media/ba015fad6dcf6784-s.woff2",
        revision: "8ea4f719af3312a055caf09f34c89a77",
      },
      { url: "/favicon.ico", revision: "e11a5f0206d813b6d6b9b92f911ccc4d" },
      { url: "/health.html", revision: "eff5bc1ef8ec9d03e640fc4370f5eacd" },
      { url: "/icons/bank.svg", revision: "0402775986442b28c46880fd4baaeacd" },
      {
        url: "/icons/compliance/eu-us-dpf.svg",
        revision: "8a4e28dd87182e9c7025eb86724e8d14",
      },
      {
        url: "/icons/compliance/gdpr-article-27.svg",
        revision: "ef23247dac8a7989f243b7beb7ef13cb",
      },
      {
        url: "/icons/compliance/hipaa.svg",
        revision: "1056707f2f329b0f1920ac04f0a8ca82",
      },
      {
        url: "/icons/compliance/iso-27001.svg",
        revision: "aafac37e42bb54061086784afd4d8435",
      },
      {
        url: "/icons/compliance/pci-dss.svg",
        revision: "c734c9e88d9b803630c9ba590a7054ee",
      },
      {
        url: "/icons/compliance/soc-2-type-ii.svg",
        revision: "7ad62661a305114c0bee2bf06f00bf76",
      },
      {
        url: "/icons/dynamic-logo.svg",
        revision: "27b99f20d4a3ca27a447a5f4ca2f044e",
      },
      {
        url: "/icons/mastercard.svg",
        revision: "8c1a7f8b4e38ddf03b2777ba7fc3a56e",
      },
      { url: "/icons/trc20.svg", revision: "36488365f21de9825e4b549ba2e70b4b" },
      { url: "/icons/usdt.svg", revision: "7b0fb7fd1d48415ca39518d541ad66ac" },
      { url: "/icons/visa.svg", revision: "de650a44d8b875b449cb2b40ad16fb48" },
      { url: "/logo.svg", revision: "c93274a3b822f7f8884b885323b2d344" },
      { url: "/manifest.json", revision: "87842a87986f289ad2397ed3a4ca76aa" },
      { url: "/placeholder.svg", revision: "961736e221b21ae7b3e35817620389e4" },
      { url: "/robots.txt", revision: "f9dff89adf98833e676de2205921996a" },
      {
        url: "/social/social-preview.svg",
        revision: "27b99f20d4a3ca27a447a5f4ca2f044e",
      },
    ], { ignoreURLParametersMatching: [] }),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [{
          cacheWillUpdate: async (
            { request: e, response: s, event: c, state: a },
          ) =>
            s && "opaqueredirect" === s.type
              ? new Response(s.body, {
                status: 200,
                statusText: "OK",
                headers: s.headers,
              })
              : s,
        }],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith("/api/auth/") && !!s.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith("/api/");
      },
      new e.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    );
});
