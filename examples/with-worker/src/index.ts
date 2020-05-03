import path from 'path'
import { parse } from 'url';
import {
	  performance,
	  PerformanceObserver
} from 'perf_hooks';
import micri, {
	IncomingMessage,
	ServerResponse,
	MicriHandler,
	Router,
	send,
	withWorker
} from 'micri';
import prime  from './prime';

const { router, on, otherwise } = Router;

const parsePath = (req: IncomingMessage): string => parse(req.url || '/').path || '/';
const withCustomOpts = (hndl: MicriHandler): MicriHandler =>
	(req: IncomingMessage, res: ServerResponse) =>
		hndl(req, res, { optX: 'Hello world!' });

const withMeasurement = (name: string, h: MicriHandler): MicriHandler => {
	let i = 0;

	return async (req: IncomingMessage, res: ServerResponse) => {
		const markPrefix = `${name}-${i}`;
		const startMark = `${markPrefix}-start`;
		const endMark = `${markPrefix}-end`;

		performance.mark(startMark);
		try {
			const pr = await h(req, res);
			return pr;
		} finally {
			// @ts-ignore
			performance.mark(endMark);
			performance.measure(`${markPrefix}`, startMark, endMark);
			i++;
		}
	}
};

const obs = new PerformanceObserver((list) => {
	console.log(list.getEntries()[0]);
	//obs.disconnect();
});
obs.observe({ entryTypes: ['measure'] });

micri(router(
	on.get((req: IncomingMessage) => parsePath(req) === '/main', prime),
	on.get((req: IncomingMessage) => parsePath(req) === '/main/perf', withMeasurement('prime-main', prime)),
	on.get((req: IncomingMessage) => parsePath(req) === '/worker', withWorker(path.join(__dirname, './prime.js'))),
	on.get((req: IncomingMessage) => parsePath(req) === '/worker/perf', withMeasurement('prime-worker', withWorker(path.join(__dirname, './prime.js')))),
	on.get((req: IncomingMessage) => parsePath(req) === '/stream', withWorker(path.join(__dirname, './stream.js'))),
	on.get((req: IncomingMessage) => parsePath(req) === '/opts', withCustomOpts(withWorker(path.join(__dirname, './opts.js')))),
	otherwise((_req: IncomingMessage, res: ServerResponse) => send(res, 400, 'Method Not Accepted'))))
	.listen(3000);
