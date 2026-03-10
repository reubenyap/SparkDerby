const isProd = process.env.NODE_ENV === 'production';

function requireInProd(envVar: string, fallback: string): string {
  const value = process.env[envVar];
  if (value) return value;
  if (isProd) {
    throw new Error(`${envVar} must be set in production`);
  }
  return fallback;
}

export default () => ({
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'sparkderby',
    user: requireInProd('DATABASE_USER', 'spark'),
    password: requireInProd('DATABASE_PASSWORD', 'spark'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  firo: {
    rpcHost: process.env.FIRO_RPC_HOST || '127.0.0.1',
    rpcPort: parseInt(process.env.FIRO_RPC_PORT || '8888', 10),
    rpcUser: requireInProd('FIRO_RPC_USER', 'firouser'),
    rpcPassword: requireInProd('FIRO_RPC_PASSWORD', 'firopass'),
    rpcTimeout: parseInt(process.env.FIRO_RPC_TIMEOUT || '30000', 10),
    treasuryAddress: process.env.TREASURY_SPARK_ADDRESS || '',
    reserveAddress: process.env.RESERVE_SPARK_ADDRESS || '',
  },
  session: {
    secret: requireInProd('SESSION_SECRET', 'dev-only-secret-do-not-use'),
    ttlDays: parseInt(process.env.SESSION_TTL_DAYS || '30', 10),
  },
});
