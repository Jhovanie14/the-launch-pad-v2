const isProd = () => process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProd()) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (!isProd()) console.log(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
