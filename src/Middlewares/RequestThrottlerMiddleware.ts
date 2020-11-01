import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import {
	HeadersParams,
	MiddlewareParams,
	RequestThrottlerManagerContract,
	ThrottleConfig,
} from '@ioc:Adonis/Addons/RequestThrottler'
import { ResponseContract } from '@ioc:Adonis/Core/Response'
import RequestLimitedException from '../Exceptions/RequestLimitedException'

export default class RequestThrottlerMiddleware {
	constructor(
		protected requestThrottler: RequestThrottlerManagerContract,
		protected config: ThrottleConfig
	) {}

	public async handle(
		{ request, response }: HttpContextContract,
		next: () => Promise<void>,
		[maxAttempt, maxAttemptPeriod]: MiddlewareParams
	): Promise<void> {
		const { requestPermitted, ...limitParams } = await this.requestThrottler.verifyRequest(
			request,
			typeof maxAttempt === 'string' ? Number(maxAttempt) : maxAttempt,
			typeof maxAttemptPeriod === 'string' ? Number(maxAttemptPeriod) : maxAttemptPeriod
		)

		this.setHeaders(response, limitParams)

		if (!requestPermitted) {
			throw new RequestLimitedException(
				this.config.limitExceptionParams.message,
				this.config.limitExceptionParams.status,
				this.config.limitExceptionParams.code
			)
		}

		await next()
	}

	protected setHeaders(
		response: ResponseContract,
		{ attemptCount, maxAttemptCount, resetTime }: HeadersParams
	) {
		const requestRemaining = maxAttemptCount - attemptCount
		response.header('X-RateLimit-Limit', String(maxAttemptCount))
		response.header('X-RateLimit-Remaining', String(requestRemaining >= 0 ? requestRemaining : 0))
		response.header('X-RateLimit-Reset', resetTime)
	}
}
