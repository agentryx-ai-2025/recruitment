import { config } from 'dotenv';
import path from 'path';

// Load .env file BEFORE anything else
config({ path: path.resolve(process.cwd(), '.env') });

// Ensure we are in test environment
process.env.NODE_ENV = 'test';

// Use test database — override DATABASE_URL so the app uses hirestream_test
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be defined in .env for tests');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
