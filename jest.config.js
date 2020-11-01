module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	verbose: false,
	testPath: '/test',
	globals: {
		'ts-jest': {
			astTransformers: {
				before: [
					{
						path: './adonisTsTransformers.js',
						options: {},
					},
				],
			},
		},
	},
}
