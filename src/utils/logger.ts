const isDev = (() => {
  try {
    return import.meta.env.MODE !== 'production';
  } catch {
    return process.env.NODE_ENV !== 'production';
  }
})();

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
};

export default logger;
