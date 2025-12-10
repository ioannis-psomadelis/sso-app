// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars';
process.env.COOKIE_SECRET = 'test-cookie-secret-for-testing';
process.env.IDP_URL = 'http://localhost:3000';
process.env.APP_A_URL = 'http://localhost:3001';
process.env.APP_B_URL = 'http://localhost:3002';
process.env.CORS_ORIGINS = 'http://localhost:3001,http://localhost:3002';

// Global test setup - runs once before all tests
export async function setup() {
  console.log('Test environment configured');
}

// Global teardown - runs once after all tests
export async function teardown() {
  console.log('Test cleanup complete');
}
