import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve .env relative to the dist/src directory → always finds the project root .env
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

dotenvConfig({ path: envPath, quiet: true });

export const config = {
  GITLAB_URL: process.env.GITLAB_URL || 'https://gitlab.com',
  GITLAB_PAT: process.env.GITLAB_PAT,
  GITLAB_PROJECT_ID: process.env.GITLAB_PROJECT_ID,
  GITLAB_TEMPLATES_PATH: process.env.GITLAB_TEMPLATES_PATH || 'templates',
};

// Only log warnings to stderr
if (!config.GITLAB_PAT) {
  process.stderr.write('Warning: GITLAB_PAT environment variable is not set.\n');
}

if (!config.GITLAB_PROJECT_ID) {
  process.stderr.write('Warning: GITLAB_PROJECT_ID environment variable is not set.\n');
}
