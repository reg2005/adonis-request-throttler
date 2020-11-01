import { CacheManagerContract } from '@ioc:Adonis/Addons/Adonis5-Cache'
import { RequestContract } from '@ioc:Adonis/Core/Request'
import DefaultClientRecognizer from './ClientRecognizers/DefaultClientRecognizer'
import dayjs from 'dayjs'
import ms from 'ms'

import {
	ClientRecognizerContract,
	ThrottleConfig,
	RequestThrottlerManagerContract,
	VisitorData,
	VerificationResult,
} from '@ioc:Adonis/Addons/RequestThrottler'

export default class RequestThrottlerManager implements RequestThrottlerManagerContract {
	protected cache: CacheManagerContract
	protected clientRecognizer: ClientRecognizerContract

	constructor(protected config: ThrottleConfig) {
		this.clientRecognizer = new DefaultClientRecognizer()
	}

	private get cacheStorage(): CacheManagerContract {
		return this.cache.viaStorage(this.config.cacheStorage)
	}

	public useCacheStorage(cache: CacheManagerContract) {
		this.cache = cache
	}

	public useClientRecognizer(clientRecognizer: ClientRecognizerContract) {
		this.clientRecognizer = clientRecognizer
	}

	public async verifyClient(
		clientIdentifier,
		permittedAttemptCount?: number,
		permittedAttemptPeriod?: number
	): Promise<VerificationResult> {
		return this.verify(clientIdentifier, permittedAttemptCount, permittedAttemptPeriod)
	}

	public async verifyRequest(
		request: RequestContract,
		permittedAttemptCount?: number,
		permittedAttemptPeriod?: number
	) {
		const clientIdentifier = await this.clientRecognizer.identifyClient(request)

		return this.verify(clientIdentifier, permittedAttemptCount, permittedAttemptPeriod)
	}

	protected async verify(
		identifier: string,
		permittedAttemptCount: number | undefined,
		permittedAttemptPeriod: number | undefined
	): Promise<VerificationResult> {
		permittedAttemptCount = permittedAttemptCount || this.config.maxAttempts
		permittedAttemptPeriod = permittedAttemptPeriod || this.config.maxAttemptPeriod

		let verificationResult = true

		const { attemptCount } =
			(await this.cacheStorage.get<VisitorData>(identifier)) ||
			RequestThrottlerManager.buildDataForNewVisitor()

		await this.cacheStorage.put<VisitorData>(
			identifier,
			{ attemptCount: attemptCount + 1 },
			permittedAttemptPeriod
		)

		if (!this.verifyByAttemptCount(attemptCount, permittedAttemptCount)) {
			verificationResult = false
		}

		return {
			maxAttemptCount: permittedAttemptCount || this.config.maxAttempts,
			attemptCount: attemptCount + 1,
			resetTime: dayjs()
				.add(ms(`${permittedAttemptPeriod}${this.config.ttlUnits}`), 'ms')
				.unix(),
			requestPermitted: verificationResult,
		}
	}

	protected verifyByAttemptCount(
		userAttemptCount: number,
		permittedAttemptCount: number | undefined
	) {
		return userAttemptCount < (permittedAttemptCount || this.config.maxAttempts)
	}

	protected static buildDataForNewVisitor() {
		return { attemptCount: 0 }
	}
}
