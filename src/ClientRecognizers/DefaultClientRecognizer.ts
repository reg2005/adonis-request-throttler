import {
	ClientRecognizerContract,
	RequestKeysForRecognizing,
} from '@ioc:Adonis/Addons/RequestThrottler'
import { RequestContract } from '@ioc:Adonis/Core/Request'

export default class DefaultClientRecognizer implements ClientRecognizerContract {
	constructor(protected readonly requestKeys: RequestKeysForRecognizing[]) {}

	public identifyClient(request: RequestContract): Promise<string> | string {
		return this.requestKeys.map((key) => request[key]()).join(':')
	}
}
