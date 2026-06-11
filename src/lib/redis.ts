// app/lib/redis.ts
import Redis from "ioredis";

let redis: Redis | null = null;
let redisReadyPromise: Promise<Redis> | null = null;

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME || "default";

  const commonOptions = {
    retryStrategy: (times: number) => {
      // Stop retry loops quickly on DNS/network issues
      if (times > 2) return null;
      return Math.min(times * 100, 500);
    },
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 10_000,
    enableOfflineQueue: false,
  };

  if (redisUrl) {
    console.log("Connecting to Redis using REDIS_URL...");
    return new Redis(redisUrl, commonOptions);
  }

  if (!host) {
    throw new Error("Redis is not configured (missing REDIS_URL or REDIS_HOST)");
  }

  console.log("Connecting to Redis using host/port...", { host, port });
  return new Redis({
    host,
    port,
    password,
    username,
    ...commonOptions,
  });
}

export function getRedisClient(): Redis {
  if (!redis) {
    redis = createRedisClient();

    redis.on("connect", () => {
      console.log("Redis connected");
    });

    redis.on("error", (error) => {
      console.error("Redis error:", error);
    });

    redis.on("close", () => {
      console.log("Redis connection closed");
    });
  }

  return redis;
}

async function getReadyRedisClient(): Promise<Redis> {
  const client = getRedisClient();

  if (client.status === "ready") {
    return client;
  }

  if (!redisReadyPromise) {
    redisReadyPromise = new Promise<Redis>((resolve, reject) => {
      const onReady = () => {
        cleanup();
        resolve(client);
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Redis connection timeout"));
      }, 5000);

      const cleanup = () => {
        clearTimeout(timer);
        client.off("ready", onReady);
        client.off("error", onError);
      };

      client.once("ready", onReady);
      client.once("error", onError);
    }).finally(() => {
      redisReadyPromise = null;
    });
  }

  return redisReadyPromise;
}

export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    redisReadyPromise = null;
    console.log("Redis disconnected");
  }
}

export async function redisGet(key: string): Promise<any> {
  try {
    const client = await getReadyRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("redisGet error:", error);
    return null;
  }
}

export async function redisSet(key: string, value: any, ttl?: number): Promise<void> {
  try {
    const client = await getReadyRedisClient();
    const serialized = JSON.stringify(value);
    const expiration = ttl || parseInt(process.env.REDIS_TTL || "1800", 10);

    await client.setex(key, expiration, serialized);
  } catch (error) {
    console.error("redisSet error:", error);
  }
}

export async function redisDel(key: string): Promise<void> {
  try {
    const client = await getReadyRedisClient();
    await client.del(key);
  } catch (error) {
    console.error("redisDel error:", error);
  }
}

export async function redisExists(key: string): Promise<boolean> {
  try {
    const client = await getReadyRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    console.error("redisExists error:", error);
    return false;
  }
}
