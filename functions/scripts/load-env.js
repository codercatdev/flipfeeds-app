/**
 * Load environment variables from .env file
 * Used by Genkit CLI scripts to ensure API keys are available
 */

const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        // Only set if not already in environment
        if (!process.env[key]) {
          process.env[key] = value;
          console.log(`✅ Loaded ${key} from .env`);
        }
      }
    }
  });
} else {
  console.warn('⚠️  .env file not found at:', envPath);
  console.warn('   Create one with: GEMINI_API_KEY=your-key');
}
