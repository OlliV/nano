// Native
import { IncomingMessage, ServerResponse, IncomingHttpHeaders, Server, createServer } from 'http';
import { Stream } from 'stream';

// Packages
import contentType from 'content-type';

// Utilities
import { MicriHandler } from './types';
import { MicriError } from './errors';

const { NODE_ENV } = process.env;
const DEV = NODE_ENV === 'development';
const jsonStringify = DEV
	? (obj: any): string => JSON.stringify(obj, null, 2)
	: (obj: any): string => JSON.stringify(obj);

const isStream = data => !!data && typeof data.pipe === 'function'

export function send(res: ServerResponse, statusCode: number, obj: any = null) {
	res.statusCode = statusCode;

	if (obj === null) {
		res.end();
		return;
	}

	if (Buffer.isBuffer(obj)) {
		if (!res.getHeader('Content-Type')) {
			res.setHeader('Content-Type', 'application/octet-stream');
		}

		res.setHeader('Content-Length', obj.length);
		res.end(obj);
		return;
	}
	
	if (isStream(obj)) {
		if (!res.getHeader('Content-Type')) {
			res.setHeader('Content-Type', 'application/octet-stream');
		}

		obj.pipe(res);
		return;
	}

	let str: string = obj;
	const typeObj = typeof obj;

	if (typeObj === 'object' || typeObj === 'number') {
		// We stringify before setting the header
		// in case `JSON.stringify` throws and a
		// 500 has to be sent instead
		str = jsonStringify(obj);

		if (!res.getHeader('Content-Type')) {
			res.setHeader('Content-Type', 'application/json; charset=utf-8');
		}
	}

	res.setHeader('Content-Length', Buffer.byteLength(str));
	res.end(str);
}

function isAcceptJson(headers: IncomingHttpHeaders) {
	const { accept } = headers;
	let type = '*/*';

	try {
		const ct = contentType.parse(accept || type);
		type = ct.type || '*/*';
	} catch (err) {
		// NOP
	}

	return type === '*/*' || accept === 'application/json';
}

export const sendError = (req: IncomingMessage, res: ServerResponse, errorObj: MicriError | Error) => {
	const acceptJson = isAcceptJson(req.headers);
	let statusCode = 500;
	let body: any = acceptJson
		? {
				error: {
					code: 'internal_server_error',
					message: 'Internal Server Error',
				},
		  }
		: 'Internal Server Error';

	if (errorObj instanceof MicriError) {
		statusCode = errorObj.statusCode || 500;
		const code = errorObj.code || 'internal_server_error';

		if (acceptJson) {
			if (DEV) {
				body = {
					error: {
						code,
						message: errorObj.message,
						stack: errorObj.stack,
						originalError: errorObj.originalError || null,
					},
				};
			} else {
				const message = errorObj.message || 'Internal Server Error';

				body = {
					error: {
						code,
						message,
					},
				};
			}
		} else {
			const message = errorObj.message || 'Internal Server Error';

			body = DEV ? errorObj.stack : message;
		}
	} else if (errorObj instanceof Error) {
		console.error(errorObj);
	} else {
		console.warn('thrown error must be an instance Error');
	}

	send(res, statusCode, body);
};

export function run<OptsType = any>(req: IncomingMessage, res: ServerResponse, fn: MicriHandler<OptsType>) {
	return new Promise((resolve) => resolve(fn(req, res)))
		.then((val) => {
			if (val === null) {
				send(res, 204, null);
				return;
			}

			// Send value if it is not undefined, otherwise assume res.end
			// will be called later
			// eslint-disable-next-line no-undefined
			if (val !== undefined) {
				send(res, res.statusCode || 200, val);
			}
		})
		.catch((err) => sendError(req, res, err));
}

export const serve = <OptsType = any>(fn: MicriHandler<OptsType>): Server =>
	createServer((req: IncomingMessage, res: ServerResponse) => run<OptsType>(req, res, fn));
