// Populates the environment with syntactically valid (but non-secret) test
// values before any application module — most of which read `env` at import
// time via src/config/env.ts — is loaded.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://test:test@localhost:3306/lms_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-please-do-not-use-in-prod-000000';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-please-do-not-use-in-prod-00000';
process.env.COOKIE_SECRET = 'test-cookie-secret-please-do-not-use-in-prod-0000000';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'silent';
// The scraper's logger is standalone and reads its own level (src/scrapers/carwale/logger.ts).
process.env.CARWALE_LOG_LEVEL = 'silent';
