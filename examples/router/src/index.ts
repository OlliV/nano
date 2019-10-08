import {
	MicriHandler,
	IncomingMessage,
	ServerResponse,
	router,
	send,
	text
} from '../micri';

const auth = (req: IncomingMessage, res: ServerResponse, accept: MicriHandler) =>
	req.headers.authorization === 'Bearer xyz' ? accept(req, res) : send(res, 403, 'Forbidden');

export default (req: IncomingMessage, res: ServerResponse) =>
	auth(req, res, () => router(req, res)
		.onGet(() => true, () => 'Hello world')
		.onPost(() => true, () => text(req))
		.otherwise((_req: IncomingMessage, res: ServerResponse) => send(res, 400, 'Invalid request method')));

