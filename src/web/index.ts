import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import stats from './stats';

const PRODUCTION = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(bodyParser.json());
app.use(stats());
app.use(function (
  err: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  err.status = err.status || 500;
  console.error(err.stack);
  res.status(err.status).json(PRODUCTION ? 'something broke!' : err.message);
});

export default app;
