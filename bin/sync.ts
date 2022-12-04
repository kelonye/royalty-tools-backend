import './utils/dotenv';
import sync from '../src/sync';

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
