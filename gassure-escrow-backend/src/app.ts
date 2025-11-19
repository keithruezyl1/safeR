import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestLogger } from './common/middleware/requestLogger';
import { notFoundHandler } from './common/middleware/notFoundHandler';
import { errorHandler } from './common/errors/errorHandler';
import { env } from './config/env';
import foundationRouter from './modules/foundation/foundation.routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN ?? true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(requestLogger);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
  });
});

app.use('/api', foundationRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

