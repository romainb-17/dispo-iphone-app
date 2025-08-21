import IORedis from 'ioredis';
const url = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = new IORedis(url, { lazyConnect: true });
export async function connectRedis(){ if (redis.status==='end' || redis.status==='wait') { await redis.connect(); } return redis; }
export async function cachedJSON(key, ttlSec, producer){
  const r = await connectRedis();
  const hit = await r.get(key);
  if (hit) { try { return JSON.parse(hit); } catch {} }
  const val = await producer();
  if (val !== undefined) await r.set(key, JSON.stringify(val), 'EX', ttlSec);
  return val;
}
