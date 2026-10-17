import 'dotenv/config';

const developmentSecret = 'kenya_pos_secure_secret_key_2026_jwt_token';
const configuredSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production') {
  if (!configuredSecret || configuredSecret === developmentSecret || configuredSecret.length < 32) {
    throw new Error('Production requires a private JWT_SECRET of at least 32 characters.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Production requires DATABASE_URL.');
  }
}
export const JWT_SECRET = configuredSecret || developmentSecret;
