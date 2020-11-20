import { IocContract } from '@adonisjs/fold/build'
import RequestThrottlerManager from '../src/RequestThrottlerManager'
import RequestThrottlerMiddleware from '../src/Middlewares/RequestThrottlerMiddleware'
import { ThrottleConfig } from '@ioc:Adonis/Addons/RequestThrottler'
import CacheClientBuilder from '../src/CacheClientBuilder'
import { RedisManagerContract } from '@ioc:Adonis/Addons/Redis'
import { CacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'
import DefaultClientRecognizer from '../src/ClientRecognizers/DefaultClientRecognizer'

export default class AdonisRequestThrottlerProvider {
	constructor(protected container: IocContract) {}

	public register(): void {
		this.container.singleton('Adonis/Addons/RequestThrottler', () => {
			const config = this.container.use('Adonis/Core/Config')
			return new RequestThrottlerManager(config.get('request-throttler'))
		})
	}

	public boot(): void {
		this.setupThrottler()
		this.registerMiddleware()
	}

	private setupThrottler() {
		const throttlerConfig: ThrottleConfig = this.container
			.use('Adonis/Core/Config')
			.get('request-throttler')
		const throttleManager = this.container.use('Adonis/Addons/RequestThrottler')

		const cacheManager: CacheManagerContract = throttlerConfig.useOwnCache
			? this.buildOwnCacheProvider(throttlerConfig, this.container)
			: this.container.use('Adonis/Addons/Adonis5-Cache')

		throttleManager.useCacheStorage(cacheManager)
		throttleManager.useClientRecognizer(
			new DefaultClientRecognizer(throttlerConfig.requestKeysForRecognizing)
		)
	}

	private buildOwnCacheProvider(config: ThrottleConfig, ioc: IocContract): CacheManagerContract {
		let redis: RedisManagerContract | null = null
		if (config.cacheStorage === 'redis') {
			redis = ioc.use('Adonis/Addons/Redis')
		}

		return new CacheClientBuilder(config, redis).buildCacheClient()
	}

	private registerMiddleware() {
		const throttleManager = this.container.use('Adonis/Addons/RequestThrottler')
		this.container.singleton('Adonis/Addons/RequestThrottler/Middleware', () => {
			const config = this.container.use('Adonis/Core/Config')
			return new RequestThrottlerMiddleware(throttleManager, config.get('request-throttler'))
		})
	}
}
