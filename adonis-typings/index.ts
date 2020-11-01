declare module '@ioc:Adonis/Addons/RequestThrottler' {
	import { CacheManagerContract, TtlUnits, CacheStorage } from '@ioc:Adonis/Addons/Adonis5-Cache'
	import { RequestContract } from '@ioc:Adonis/Core/Request'

	export type VisitorData = {
		attemptCount: number
	}

	export interface ClientRecognizerContract {
		identifyClient(request: RequestContract): Promise<string> | string
	}

	export interface VerificationResult {
		maxAttemptCount: number

		attemptCount: number

		resetTime: number

		requestPermitted: boolean
	}

	export type HeadersParams = Omit<VerificationResult, 'requestPermitted'>

	export type MiddlewareParams = [string | undefined, string | undefined]

	export interface RequestThrottlerManagerContract {
		useCacheStorage(cache: CacheManagerContract): void

		useClientRecognizer(clientRecognizer: ClientRecognizerContract): void

		verifyClient(
			clientIdentifier: string,
			maxAttempts?: number,
			maxAttemptPeriod?: number
		): Promise<VerificationResult>

		verifyRequest(
			request: RequestContract,
			maxAttempts?: number,
			maxAttemptPeriod?: number
		): Promise<VerificationResult>
	}

	export type ThrottleDataStorages = 'redis' | 'in-memory'

	export interface ThrottleConfig {
		cacheStorage: ThrottleDataStorages

		useOwnCache: boolean

		ttlUnits: TtlUnits

		maxAttempts: number

		maxAttemptPeriod: number

		limitExceptionParams: {
			status: number
			code: string
			message: string
		}
	}

	const RequestThrottlerManager: RequestThrottlerManagerContract

	export default RequestThrottlerManager
}
