export default class ExceptionHandler {
	protected ignoreStatuses = []

	public async handle(error, ctx) {
		return error.handle(error, ctx)
	}
}
