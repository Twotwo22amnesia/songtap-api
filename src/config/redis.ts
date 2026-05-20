import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

const redisUrl = process.env.REDIS_URL

export const redis = redisUrl && !redisUrl.includes('...')
  ? new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    })
  : null

if (redis) {
  redis.on('connect', () => console.log('✅ Redis conectado'))
  redis.on('error', (err) => console.warn('⚠️  Redis error:', err.message))
}