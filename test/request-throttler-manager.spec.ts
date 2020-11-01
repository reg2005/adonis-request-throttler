import RequestThrottlerManager from '../src/RequestThrottlerManager'
import CacheManager from 'adonis5-cache/build/src/CacheManager'
import {
	ClientRecognizerContract,
	ThrottleConfig,
	VisitorData,
} from '@ioc:Adonis/Addons/RequestThrottler'
import { RequestContract } from '@ioc:Adonis/Core/Request'
import Request from '@adonisjs/http-server/build/src/Request'
import { deepEqual, instance, mock, verify, when } from 'ts-mockito'
import dayjs from 'dayjs'

const testConfig: ThrottleConfig = {
	maxAttempts: 10,
	useOwnCache: false,

	maxAttemptPeriod: 10,

	ttlUnits: 'm',

	cacheStorage: 'redis',

	limitExceptionParams: {
		code: 'E_LIMIT_EXCEPTION',
		message: 'Maximum number of login attempts exceeded. Please try again later.',
		status: 429,
	},
}

describe('Request Throttler Manager', () => {
	let throttleManager: RequestThrottlerManager

	beforeEach(() => {
		throttleManager = new RequestThrottlerManager(testConfig)
	})

	describe('Verify request', () => {
		const requestParams = {
			ip: '127.0.0.1',
			url: 'throttle-test',
			method: 'POST',
		}

		let requestIdentifier = [requestParams.method, requestParams.url, requestParams.ip].join(':')

		let fakeRequest: RequestContract

		beforeEach(() => {
			let mockedRequest: RequestContract = mock(Request)
			when(mockedRequest.ip()).thenReturn(requestParams.ip)
			when(mockedRequest.url()).thenReturn(requestParams.url)
			when(mockedRequest.method()).thenReturn(requestParams.method)
			fakeRequest = instance(mockedRequest)
		})

		test('should allow access for user', async () => {
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(requestIdentifier)).thenReturn(Promise.resolve(null))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyRequest(fakeRequest)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: true,
				attemptCount: 1,
				maxAttemptCount: testConfig.maxAttempts,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

			verify(
				mockedCache.put(
					requestIdentifier,
					deepEqual({ attemptCount: 1 }),
					testConfig.maxAttemptPeriod
				)
			).once()
		})

		test('should reject request', async () => {
			const cachedLastUserVisitData: VisitorData = {
				attemptCount: testConfig.maxAttempts,
			}
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(requestIdentifier)).thenReturn(Promise.resolve(cachedLastUserVisitData))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyRequest(fakeRequest)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: false,
				attemptCount: testConfig.maxAttempts + 1,
				maxAttemptCount: testConfig.maxAttempts,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

			verify(
				mockedCache.put(
					requestIdentifier,
					deepEqual({ attemptCount: cachedLastUserVisitData.attemptCount + 1 }),
					testConfig.maxAttemptPeriod
				)
			).once()
		})

		describe('with custom client recognizer', () => {
			const clientIdentifier = 'client_007'

			beforeEach(() => {
				const customClientRecognizer: ClientRecognizerContract = {
					async identifyClient() {
						return clientIdentifier
					},
				}

				throttleManager.useClientRecognizer(customClientRecognizer)
			})

			test('should use custom client recognizer during request verification', async () => {
				const mockedCache = mock(CacheManager)
				when(mockedCache.get(requestIdentifier)).thenReturn(Promise.resolve(null))

				const mockedCacheForStorageAccess = mock(CacheManager)
				when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
					instance(mockedCache)
				)
				throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

				const {
					maxAttemptCount,
					attemptCount,
					resetTime,
					requestPermitted,
				} = await throttleManager.verifyRequest(fakeRequest)

				expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
					requestPermitted: true,
					attemptCount: 1,
					maxAttemptCount: testConfig.maxAttempts,
				})
				expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
				expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

				verify(
					mockedCache.put(
						clientIdentifier,
						deepEqual({ attemptCount: 1 }),
						testConfig.maxAttemptPeriod
					)
				).once()
			})
		})

		test('should verify request with custom attempt period', async () => {
			const cachedLastUserVisitData: VisitorData = {
				attemptCount: testConfig.maxAttempts,
			}
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(requestIdentifier)).thenReturn(Promise.resolve(cachedLastUserVisitData))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyRequest(fakeRequest, testConfig.maxAttempts * 2)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: true,
				attemptCount: testConfig.maxAttempts + 1,
				maxAttemptCount: testConfig.maxAttempts * 2,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

			verify(
				mockedCache.put(
					requestIdentifier,
					deepEqual({ attemptCount: cachedLastUserVisitData.attemptCount + 1 }),
					testConfig.maxAttemptPeriod
				)
			).once()
		})

		test('should verify request with custom attempt period and custom attempt period', async () => {
			const cachedLastUserVisitData: VisitorData = {
				attemptCount: testConfig.maxAttempts,
			}
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(requestIdentifier)).thenReturn(Promise.resolve(cachedLastUserVisitData))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyRequest(
				fakeRequest,
				testConfig.maxAttempts * 2,
				testConfig.maxAttemptPeriod * 2
			)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: true,
				attemptCount: testConfig.maxAttempts + 1,
				maxAttemptCount: testConfig.maxAttempts * 2,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(
				dayjs()
					.add(testConfig.maxAttemptPeriod * 2, 'm')
					.unix()
			)

			verify(
				mockedCache.put(
					requestIdentifier,
					deepEqual({ attemptCount: cachedLastUserVisitData.attemptCount + 1 }),
					testConfig.maxAttemptPeriod * 2
				)
			).once()
		})
	})

	describe('Verify client', () => {
		let clientIdentifier = 'client_007'

		test('should allow access for user', async () => {
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(clientIdentifier)).thenReturn(Promise.resolve(null))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyClient(clientIdentifier)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: true,
				attemptCount: 1,
				maxAttemptCount: testConfig.maxAttempts,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

			verify(
				mockedCache.put(
					clientIdentifier,
					deepEqual({ attemptCount: 1 }),
					testConfig.maxAttemptPeriod
				)
			).once()
		})

		test('should return false as verification result, user has used all attempts', async () => {
			const cachedLastUserVisitData: VisitorData = {
				attemptCount: testConfig.maxAttempts,
			}
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(clientIdentifier)).thenReturn(Promise.resolve(cachedLastUserVisitData))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyClient(clientIdentifier)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: false,
				attemptCount: testConfig.maxAttempts + 1,
				maxAttemptCount: testConfig.maxAttempts,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

			verify(
				mockedCache.put(
					clientIdentifier,
					deepEqual({ attemptCount: cachedLastUserVisitData.attemptCount + 1 }),
					testConfig.maxAttemptPeriod
				)
			).once()
		})

		test('should verify user with custom attempt count', async () => {
			const cachedLastUserVisitData: VisitorData = {
				attemptCount: testConfig.maxAttempts,
			}
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(clientIdentifier)).thenReturn(Promise.resolve(cachedLastUserVisitData))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyClient(clientIdentifier, testConfig.maxAttempts * 2)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: true,
				attemptCount: testConfig.maxAttempts + 1,
				maxAttemptCount: testConfig.maxAttempts * 2,
			})
			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(dayjs().add(testConfig.maxAttemptPeriod, 'm').unix())

			verify(
				mockedCache.put(
					clientIdentifier,
					deepEqual({ attemptCount: cachedLastUserVisitData.attemptCount + 1 }),
					testConfig.maxAttemptPeriod
				)
			).once()
		})

		test('should use custom attempt period for verification', async () => {
			const cachedLastUserVisitData: VisitorData = {
				attemptCount: testConfig.maxAttempts,
			}
			const mockedCache = mock(CacheManager)
			when(mockedCache.get(clientIdentifier)).thenReturn(Promise.resolve(cachedLastUserVisitData))

			const mockedCacheForStorageAccess = mock(CacheManager)
			when(mockedCacheForStorageAccess.viaStorage(testConfig.cacheStorage)).thenReturn(
				instance(mockedCache)
			)
			throttleManager.useCacheStorage(instance(mockedCacheForStorageAccess))

			const {
				maxAttemptCount,
				attemptCount,
				resetTime,
				requestPermitted,
			} = await throttleManager.verifyClient(
				clientIdentifier,
				testConfig.maxAttempts,
				testConfig.maxAttemptPeriod * 2
			)

			expect({ maxAttemptCount, attemptCount, requestPermitted }).toEqual({
				requestPermitted: false,
				attemptCount: testConfig.maxAttempts + 1,
				maxAttemptCount: testConfig.maxAttempts,
			})

			expect(resetTime).toBeGreaterThanOrEqual(dayjs().unix())
			expect(resetTime).toBeLessThanOrEqual(
				dayjs()
					.add(testConfig.maxAttemptPeriod * 2, 'm')
					.unix()
			)

			verify(
				mockedCache.put(
					clientIdentifier,
					deepEqual({ attemptCount: cachedLastUserVisitData.attemptCount + 1 }),
					testConfig.maxAttemptPeriod * 2
				)
			).once()
		})
	})
})
