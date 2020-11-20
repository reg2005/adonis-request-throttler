import { RequestKeysForRecognizing } from '@ioc:Adonis/Addons/RequestThrottler'
import { RequestContract } from '@ioc:Adonis/Core/Request'
import Request from '@adonisjs/http-server/build/src/Request'
import { instance, mock, verify, when } from 'ts-mockito'
import DefaultClientRecognizer from '../src/ClientRecognizers/DefaultClientRecognizer'

type RequestData = Partial<Record<RequestKeysForRecognizing, string>>
describe('Default client recognizer', () => {
	function buildFakeRequest(requestParams: RequestData) {
		let mockedRequest: RequestContract = mock(Request)
		for (const [key, value] of Object.entries(requestParams)) {
			when(mockedRequest[key]()).thenReturn(value)
		}
		return { mockedRequest, instanceRequest: instance(mockedRequest) }
	}

	it('should return correct identifier for client by ip and method', () => {
		const keys: RequestKeysForRecognizing[] = ['ip', 'method']
		const requestParams: RequestData = {
			ip: '192.168',
			method: 'GET',
		}
		const clientRecognizer = new DefaultClientRecognizer(keys)

		const { mockedRequest, instanceRequest } = buildFakeRequest(requestParams)
		expect(clientRecognizer.identifyClient(instanceRequest)).toEqual(
			[requestParams.ip, requestParams.method].join(':')
		)

		keys.map((key) => verify(mockedRequest[key]()).once())
	})

	it('should return correct identifier for client by empty list of request keys', () => {
		const keys: RequestKeysForRecognizing[] = []
		const requestParams: RequestData = {}
		const clientRecognizer = new DefaultClientRecognizer(keys)

		expect(
			clientRecognizer.identifyClient(buildFakeRequest(requestParams).instanceRequest)
		).toEqual('')
	})
})
