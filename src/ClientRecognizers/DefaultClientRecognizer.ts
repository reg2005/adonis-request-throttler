import { RequestContract } from '@ioc:Adonis/Core/Request'
import { ClientRecognizerContract } from '@ioc:Adonis/Addons/RequestThrottler'

export default class DefaultClientRecognizer implements ClientRecognizerContract {
	public identifyClient(request: RequestContract): Promise<string> | string {
		return [request.method(), request.url(), request.ip()].join(':')
	}
}
