// config/loadEnv.js
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../.env.${environment}`);

// Only try to load .env file if it exists (Azure App Service uses environment variables directly)
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`📦 Loaded environment file: .env.${environment}`);
} else {
  console.log(`📦 No .env.${environment} file found - using system environment variables`);
  // Still load default .env if it exists
  const defaultEnvPath = path.resolve(__dirname, '../.env');
  if (existsSync(defaultEnvPath)) {
    dotenv.config({ path: defaultEnvPath });
    console.log(`📦 Loaded default .env file`);
  }
}
