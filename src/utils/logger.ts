export const logger = {
  log: (message: string) => {
    process.stderr.write(`[LOG] ${message}\n`);
  },
  error: (message: string, error?: any) => {
    process.stderr.write(`[ERROR] ${message} ${error ? (error instanceof Error ? error.stack : JSON.stringify(error)) : ''}\n`);
  },
  warn: (message: string) => {
    process.stderr.write(`[WARN] ${message}\n`);
  },
  info: (message: string) => {
    process.stderr.write(`[INFO] ${message}\n`);
  },
};
