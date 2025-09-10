const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
};

export default logger;
