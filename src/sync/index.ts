import Debug from 'debug';
import * as qs from 'querystring';
import fetch from 'cross-fetch';

import { COLLECTIONS } from '../config';
import { Sale } from '../types';
import { sleep } from '../utils/promise';
import * as db from '../utils/db';

const debug = Debug('backend:stats');
const LIMIT = 10;

export default sync;

async function sync(fromNow?: boolean) {
  for (const [collectionSymbol, updateAuthority] of COLLECTIONS.entries()) {
    try {
      await syncCollection(collectionSymbol, updateAuthority, fromNow);
    } catch (e) {
      console.warn(e);
    }
  }
}

async function syncCollection(
  collectionSymbol: string,
  updateAuthority: string,
  fromNow?: boolean
) {
  const c = await db.collection();
  const noOfSales = fromNow
    ? 0
    : await c.count({
        collection_symbol: collectionSymbol,
      });
  debug('%s: syncing, no of sales(%d)', collectionSymbol, noOfSales);

  if (!noOfSales || noOfSales > LIMIT) {
    const oldestSale = fromNow
      ? null
      : await c.findOne(
          {
            collection_symbol: collectionSymbol,
          },
          {
            sort: {
              time: 1,
            },
          }
        );

    debug(
      '%s: querying sales before %s',
      collectionSymbol,
      oldestSale ? oldestSale.time : 'now'
    );

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

    if (sales.length) {
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
        await syncCollection(collectionSymbol, updateAuthority);
      }
    }
  }

  debug('complete');
}
