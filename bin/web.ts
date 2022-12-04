import './utils/dotenv';
import Debug from 'debug';

const debug = Debug('backend:web');
import app from '../src/web';

const PORT = process.env.PORT;

app.listen(PORT, () => {
  debug(`listening on port ${PORT}`);
});
