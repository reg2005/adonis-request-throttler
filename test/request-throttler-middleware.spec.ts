import { ThrottleConfig } from '@ioc:Adonis/Addons/RequestThrottler'
import AdonisApplication from 'adonis-provider-tester'
import AdonisCacheProvider from 'adonis5-cache/build'
import AdonisRequestThrottlerProvider from '../providers/AdonisRequestThrottlerProvider'
import { ServerContract } from '@ioc:Adonis/Core/Server'
import Route from '@ioc:Adonis/Core/Route'
import supertest from 'supertest'
import { CacheConfig } from '@ioc:Adonis/Addons/Adonis5-Cache'
import dayjs from 'dayjs'

const testConfig: ThrottleConfig = {
	maxAttempts: 10,
	useOwnCache: false,

	maxAttemptPeriod: 10,

	ttlUnits: 'm',

	cacheStorage: 'in-memory',

	limitExceptionParams: {
		code: 'E_LIMIT_EXCEPTION',
		message: 'Maximum number of login attempts exceeded. Please try again later.',
		status: 429,
	},

	requestKeysForRecognizing: ['method', 'url', 'ip'],
}
const cacheConfig: CacheConfig = {
	recordTTL: 60000, // record ttl in ms,

	currentCacheStorage: 'in-memory', // storages which used as default cache storage

	enabledCacheStorages: ['in-memory'], // storages which will be loaded

	cacheKeyPrefix: 'cache_record_', // prefix for keys, which will be stored in cache storage

	enabledEvents: {
		'cache-record:read': false,
		'cache-record:written': false,
		'cache-record:missed': false,
		'cache-record:forgotten': false,
	},
	ttlUnits: 'm',
}

describe.each([
	['with own cache provider', { ...testConfig }],
	['with adonis cache provider', { ...testConfig, useOwnCache: true }],
])('Request throttle middleware - %s', (_, throttlerConfig) => {
	let router: typeof Route
	let app: AdonisApplication
	let server: ServerContract

	beforeEach(async () => {
		app = await new AdonisApplication()
			.registerProvider(AdonisCacheProvider)
			.registerProvider(AdonisRequestThrottlerProvider)
			.registerAppConfig({ configName: 'cache', appConfig: cacheConfig })
			.registerAppConfig({ configName: 'request-throttler', appConfig: throttlerConfig })
			.loadApp()

		server = app.iocContainer.use('Adonis/Core/Server')
		router = app.iocContainer.use('Adonis/Core/Route')

		server.middleware.registerNamed({
			'request-throttler': 'Adonis/Addons/RequestThrottler/Middleware',
		})

		router
			.get('/test', async () => {
				return { success: true }
			})
			.middleware(['request-throttler'])

		await app.httpServer.start()
	})

	afterEach(async () => {
		await app.stopServer()
	})

	describe('Success request verification', () => {
		beforeAll(async () => {
			throttlerConfig = { ...testConfig }
		})

		it('should allow request and send correct headers', async () => {
			const response = await supertest(server.instance).get('/test').expect(200, { success: true })

			expect(response.headers).toMatchObject({
				'x-ratelimit-limit': String(testConfig.maxAttempts),
				'x-ratelimit-remaining': String(testConfig.maxAttempts - 1),
			})
			expect(Number(response.headers['x-ratelimit-reset'])).toBeGreaterThanOrEqual(dayjs().unix())
			expect(Number(response.headers['x-ratelimit-reset'])).toBeLessThanOrEqual(
				dayjs().add(testConfig.maxAttemptPeriod, 'm').unix()
			)
		})
	})

	describe('Request limited', () => {
		beforeAll(async () => {
			throttlerConfig = { ...testConfig, maxAttempts: 0 }
		})

		it('should allow request and send correct headers', async () => {
			const response = await supertest(server.instance).get('/test').expect(429, {
				message: testConfig.limitExceptionParams.message,
				code: testConfig.limitExceptionParams.code,
			})

			expect(response.headers).toMatchObject({
				'x-ratelimit-limit': String(throttlerConfig.maxAttempts),
				'x-ratelimit-remaining': String(0),
			})

			expect(Number(response.headers['x-ratelimit-reset'])).toBeGreaterThanOrEqual(dayjs().unix())
			expect(Number(response.headers['x-ratelimit-reset'])).toBeLessThanOrEqual(
				dayjs().add(testConfig.maxAttemptPeriod, 'm').unix()
			)
		})
	})
})
