// Native
import { IncomingMessage, ServerResponse } from 'http';

// Utilities
import { MicriHandler } from './types';

type Predicate = (req: IncomingMessage, res: ServerResponse) => boolean;

const matched = (x: any) => ({
	on: () => matched(x),
	onGet: () => matched(x),
	onHead: () => matched(x),
	onPost: () => matched(x),
	onPut: () => matched(x),
	onDelete: () => matched(x),
	onConnect: () => matched(x),
	onOptions: () => matched(x),
	onTrace: () => matched(x),
	onPatch: () => matched(x),
	otherwise: () => x
});

const match = (req: IncomingMessage, res: ServerResponse) => ({
	on: (pred: Predicate, fn: MicriHandler) => (pred(req, res) ? matched(fn(req, res)) : match(req, res)),
	onGet: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'GET' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onHead: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'HEAD' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onPost: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'POST' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onPut: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'PUT' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onDelete: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'DELETE' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onConnect: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'CONNECT' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onOptions: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'OPTIONS' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onTrace: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'TRACE' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	onPatch: (pred: Predicate, fn: MicriHandler) =>
		req.method === 'PATCH' && pred(req, res) ? matched(fn(req, res)) : match(req, res),
	otherwise: (fn: MicriHandler) => fn(req, res)
});

export default match;
