export default () => ({
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'sparkderby',
    user: process.env.DATABASE_USER || 'spark',
    password: process.env.DATABASE_PASSWORD || 'spark',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  firo: {
    rpcHost: process.env.FIRO_RPC_HOST || '127.0.0.1',
    rpcPort: parseInt(process.env.FIRO_RPC_PORT || '8888', 10),
    rpcUser: process.env.FIRO_RPC_USER || 'firouser',
    rpcPassword: process.env.FIRO_RPC_PASSWORD || 'firopass',
    rpcTimeout: parseInt(process.env.FIRO_RPC_TIMEOUT || '30000', 10),
    treasuryAddress: process.env.TREASURY_SPARK_ADDRESS || '',
    reserveAddress: process.env.RESERVE_SPARK_ADDRESS || '',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-me',
    ttlDays: parseInt(process.env.SESSION_TTL_DAYS || '30', 10),
  },
});
