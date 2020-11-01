import { Exception } from '@poppinss/utils'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class RequestLimitedException extends Exception {
	constructor(message: string, status: number, code: string) {
		super(message, status, code)
		this.message = message
		this.code = code
		this.status = status
	}

	public async handle(error: this, { response }: HttpContextContract) {
		response.status(error.status).send({
			message: error.message,
			code: error.code,
		})
	}
}
