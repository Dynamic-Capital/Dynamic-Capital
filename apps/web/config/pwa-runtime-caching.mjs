/** @typedef {import('next-pwa').RuntimeCaching} RuntimeCaching */

const TON_GATEWAY_HOSTS = [
  "dynamiccapital.ton",
  "www.dynamiccapital.ton",
  "ton-gateway.dynamic-capital.ondigitalocean.app",
  "ton-gateway.dynamic-capital.lovable.app",
];

/** @type {RuntimeCaching[]} */
const runtimeCaching = [
  {
    urlPattern: /^https:\/\/(?:static|fonts)\.gstatic\.com\/.*/i,
    handler: "CacheFirst",
    options: {
      cacheName: "dynamic-google-fonts",
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "dynamic-google-font-stylesheets",
      expiration: {
        maxEntries: 16,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
    },
  },
  {
    urlPattern: ({ url }) => TON_GATEWAY_HOSTS.includes(url.hostname),
    handler: "NetworkFirst",
    options: {
      cacheName: "dynamic-ton-gateway",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 60 * 60,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "dynamic-media",
      expiration: {
        maxEntries: 128,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      },
    },
  },
  {
    urlPattern: /^https:\/\/.*\.(?:js|css)$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "dynamic-static-resources",
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      },
    },
  },
  {
    urlPattern: ({ url }) =>
      url.pathname.startsWith("/api/") || url.pathname.startsWith("/ton"),
    handler: "NetworkFirst",
    method: "GET",
    options: {
      cacheName: "dynamic-api",
      networkTimeoutSeconds: 8,
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 60 * 5,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
];

export default runtimeCaching;
