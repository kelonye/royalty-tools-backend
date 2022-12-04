import './utils/dotenv';
import sync from '../src/sync';
import * as db from '../src/utils/db';

sync()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(db.teardown);
