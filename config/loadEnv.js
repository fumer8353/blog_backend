// config/loadEnv.js
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const environment = process.env.NODE_ENV || 'development';
const envPath = path.resolve(__dirname, `../.env.${environment}`);

dotenv.config({ path: envPath });

console.log(`📦 Loaded environment file: .env.${environment}`);
