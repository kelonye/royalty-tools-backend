import Debug from 'debug';
import * as qs from 'querystring';
import fetch from 'cross-fetch';

import { COLLECTIONS } from '../config';
import { Sale } from '../types';
import { sleep } from '../utils/promise';
import * as db from '../utils/db';

const debug = Debug('backend:stats');
const LIMIT = 100;

export default scan;

async function scan() {
  for (const [collectionSymbol, updateAuthority] of COLLECTIONS.entries()) {
    debug('scanning %s', collectionSymbol);
    await scanCollection(collectionSymbol, updateAuthority);
  }
}

async function scanCollection(
  collectionSymbol: string,
  updateAuthority: string
) {
  const c = await db.collection();
  const noOfSales = await c.estimatedDocumentCount();

  if (noOfSales > LIMIT) {
    const oldestSale = await c.findOne(
      {
        collection_symbol: collectionSymbol,
      },
      {
        sort: {
          time: 1,
        },
      }
    );

    debug('querying sales before %s', oldestSale ? oldestSale.time : 'now');

    const sales: Sale[] = await (
      await fetch(
        'https://api.coralcube.cc/0dec5037-f67d-4da8-9eb6-97e2a09ffe9a/inspector/getMintActivities?' +
          qs.stringify({
            update_authority: updateAuthority,
            collection_symbol: collectionSymbol,
            limit: LIMIT,
            ...(!oldestSale ? null : { time: oldestSale.time }),
          }),
        {
          headers: {
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
          },
        }
      )
    ).json();

    const bulkWriteOpts = sales.map((sale) => ({
      updateMany: {
        filter: { signature: sale.signature },
        update: {
          $set: { ...sale, collection_symbol: collectionSymbol },
        },
        upsert: true,
      },
    }));

    await c.bulkWrite(bulkWriteOpts);

    if (sales.length === LIMIT) {
      await sleep(1000);
      await scanCollection(collectionSymbol, updateAuthority);
    }
  }

  debug('complete');
}
