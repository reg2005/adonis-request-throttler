import { ThrottleConfig } from '@ioc:Adonis/Addons/RequestThrottler'
import { CacheConfig, CacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'
import CacheManager from 'adonis5-cache/build/src/CacheManager'
import InMemoryStorage from 'adonis5-cache/build/src/CacheStorages/InMemoryStorage'
import RedisStorage from 'adonis5-cache/build/src/CacheStorages/RedisStorage'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'

export default class CacheClientBuilder {
	constructor(
		protected config: ThrottleConfig,
		protected redis: RedisManagerContract | null
	) {}

	public buildCacheClient(): CacheManagerContract {
		const manager = new CacheManager({
			config: this.buildCacheConfig(),
			eventEmitter: null as any,
		})

		if (this.config.cacheStorage === 'redis' && this.redis) {
			manager.registerStorage('redis', new RedisStorage(this.redis))
		}

		if (this.config.cacheStorage === 'in-memory') {
			manager.registerStorage('in-memory', new InMemoryStorage())
		}

		return manager
	}

	protected buildCacheConfig(): CacheConfig {
		return {
			recordTTL: this.config.maxAttemptPeriod,
			ttlUnits: this.config.ttlUnits,
			currentCacheStorage: this.config.cacheStorage,
			enabledCacheStorages: [this.config.cacheStorage],
			cacheKeyPrefix: 'request_throttler_record_',
			enabledEvents: {
				'cache-record:read': false,
				'cache-record:written': false,
				'cache-record:missed': false,
				'cache-record:forgotten': false,
			},
		}
	}
}
