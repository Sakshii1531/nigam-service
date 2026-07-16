import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { isProd, isTest } from '../config/env.js';

export const requestLogger = pinoHttp({
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing || randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  autoLogging: !isTest,
  level: isProd ? 'info' : 'debug',
  transport: isProd
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});
