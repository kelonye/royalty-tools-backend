import './utils/dotenv';
import cron from 'node-cron';
import Debug from 'debug';
import sync from '../src/sync';
import * as db from '../src/utils/db';

const debug = Debug('backend:cron');

// every 10 minutes
cron.schedule('*/10 * * * *', async function () {
  debug('running at', new Date());
  sync(true).finally(db.teardown);
});
