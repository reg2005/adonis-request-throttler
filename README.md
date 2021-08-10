# Adonis-Request-Throttler
> Request limiter for Adonis JS 5

[![typescript-image]][typescript-url] [![npm-image]][npm-url] [![license-image]][license-url]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Installation](#installation)
- [Sample Usage](#sample-usage)
  - [Throttler middleware](#throttler-middleware)
  - [Throttler service](#throttler-service)
- [Configuration](#configuration)
- [Request recognizer](#request-recognizer)
- [Cache storage](#cache-storage)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Installation
Install [Adonis redis client](https://github.com/adonisjs/redis), if you want to use redis as storage for request info.
```bash
npm i --save adonis-request-throttler
```

Install provider:
```bash
node ace configure adonis-request-throttler
```
* For other configuration, please update the `config/request-throttler.ts`.

# Sample Usage
## Throttler middleware
After adding cache provider to your app, you can import CacheManager for accessing to cache.
```ts
// start/kernel.ts
Server.middleware.registerNamed({
  throttle: 'Adonis/Addons/RequestThrottler/Middleware'
})
```
And then you can add middleware to your routes:
```js
Route
  .get('subscribers', 'SubscriberController.index')
  .middleware('throttle')
```
This middleware will limit user requests to endpoint. Configure default count and timeout in throttle config. For custom configuration you can add values as middleware params:
```js
Route
  .get('subscribers', 'SubscriberController.index')
  .middleware('throttle:10,20')
```
First param is responsible for max attempt count, second params means time limit after exceeding the quota.

## Throttler service

You can also use throttler in your services by client identifier:
```ts
import RequestThrottler from '@ioc:Adonis/Addons/RequestThrottler'

RequestThrottler.verifyClient(userId, 10, 15)
```
Or you can verify request in your controller:
```ts
import {HttpContextContract} from "@ioc:Adonis/Core/HttpContext";
import RequestThrottler from '@ioc:Adonis/Addons/RequestThrottler'

export default class ControllerExample {
  public async index({ request }: HttpContextContract) {
    await RequestThrottler.verifyRequest(request)

    return // endpoint data
  }
}

```
# Configuration
For configuring request throttler use **request-throttler.ts** file in config dir.
```ts
import { ThrottleConfig } from '@ioc:Adonis/Addons/RequestThrottler'

export default {
	maxAttempts: 10,

	maxAttemptPeriod: 600000,

	ttlUnits: 'ms',

	cacheStorage: 'redis',

	useOwnCache: true,

	limitExceptionParams: {
		code: 'E_LIMIT_EXCEPTION',
		message: 'Maximum number of login attempts exceeded. Please try again later.',
		status: 429,
	},

	requestKeysForRecognizing: ['method', 'hostname', 'url', 'ip'],
} as ThrottleConfig
```
You can configure such options:
- **maxAttempts** - permitted request count for user for permitted request count

- **maxAttemptPeriod** - specify ttl for record, which store info about last user request

- **ttlUnits** - time units for maxAttemptPeriod property

- **cacheStorage** - specify storage for requests information

- **useOwnCache** - specify is request throttler uses own cache provider or takes already instantiated cache provider from Adonis IoC container

- **limitExceptionParams** - specify params for limit exception, you can change http status or add localization for message

- **requestKeysForRecognizing** - specify request keys for recognizing the client and the route

# Request recognizer
By default for request verifying throttler takes info about method, hostname, url, ip of request. If you need to specify request recognizing you should implement **ClientRecognizerContract** interface in your custom recognizer.

```ts
import { RequestContract } from '@ioc:Adonis/Core/Request'
import { ClientRecognizerContract } from '@ioc:Adonis/Addons/RequestThrottler'

export default class CustomClientRecognizer implements ClientRecognizerContract {
	public identifyClient(request: RequestContract): Promise<string> | string {
		return // client-identifier
	}
}
```
And then you should register your recognizer. For example you can do it in this way:
```ts
import RequestThrottler from '@ioc:Adonis/Addons/RequestThrottler'

RequestThrottler.useClientRecognizer(new CustomClientRecognizer())
```
Then your requests will recognize using your custom recognizer.

# Cache storage
This packages based on [adonis cache package](https://github.com/reg2005/adonis5-cache#readme). Throttler can work in two modes. By default throttler creates own cache client and uses it for storing info about requests. If you use Adonis cache you can use already instantiated provider for throttler. For using adonis cache set false to **useOwnCache** parameter in your throttler config.

**You need the same `ttlUnits` in your `cache` and `request-throttler` config.**

You should register cache provider before request-throttler:
```json
{
"providers": [
    "./providers/AppProvider",
    "@adonisjs/core",
    "@adonisjs/lucid",
    "@adonisjs/redis",
    "adonis5-cache",
    "adonis-request-throttler"
  ]
}
```
When you use [adonis5-cache](https://github.com/reg2005/adonis5-cache#readme) as storage, you can add custom storages for storing request data. Read more about this in adonis5-cache [docs](https://github.com/reg2005/adonis5-cache#readme).

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"

[npm-image]: https://img.shields.io/npm/v/adonis-request-throttler.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/adonis-request-throttler "npm"

[license-image]: https://img.shields.io/npm/l/adonis-request-throttler?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"
