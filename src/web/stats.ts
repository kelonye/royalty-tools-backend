import express from 'express';
import * as db from '../utils/db';
import { COLLECTIONS } from '../config';

const MAX_PAGE_COUNT = 100;
const MARKET_COLORS = ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'];

export default function () {
  const app = express.Router();

  app.get('/collections', async (req, res) => {
    res.json(Array.from(COLLECTIONS.keys()));
  });

  app.get('/sales/:collectionSymbol', async (req, res) => {
    const {
      params: { collectionSymbol },
    } = req;

    const pageArg = parseNumberQueryParam(req.query.page as string, 0);
    const countArg = parseNumberQueryParam(
      req.query.count as string,
      MAX_PAGE_COUNT
    );
    const count = countArg > MAX_PAGE_COUNT ? MAX_PAGE_COUNT : countArg;
    const frm = pageArg * count;

    const query = getQueryParams(collectionSymbol, req.query);

    const dbQuery: Record<string, any> = {
      $or: [query],
    };

    const c = await db.collection();
    const [totalCount, sales] = await Promise.all([
      c.count(dbQuery),
      c.find(dbQuery).sort('time', -1).skip(frm).limit(count),
    ]);

    res.json({
      totalCount,
      data: await sales.toArray(),
    });
  });

  app.get('/chart/:collectionSymbol', async (req, res) => {
    const c = await db.collection();

    const {
      params: { collectionSymbol },
    } = req;
    const query = getQueryParams(collectionSymbol, req.query);

    const markets = await c
      .aggregate([
        {
          $match: query,
        },
        {
          $group: {
            _id: '$marketplace',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const labels = markets.map((market) => market._id);
    const datasets = [
      {
        data: markets.map((market) => market.count),
        backgroundColor: markets.map(
          (market, i) => MARKET_COLORS[i % MARKET_COLORS.length]
        ),
      },
    ];

    res.json({ labels, datasets });
  });

  app.get('/summary/:collectionSymbol', async (req, res) => {
    const c = await db.collection();

    const {
      params: { collectionSymbol },
    } = req;
    const query = getQueryParams(collectionSymbol, req.query);

    const [totalSales, totalUnPaidSales, totalMarketFee, totalPrice] =
      await Promise.all([
        c.count(query),
        c.count({ ...query, royalty_fee: 0 }),
        c
          .aggregate([
            {
              $match: { ...query },
            },
            { $group: { _id: null, totalMarketFee: { $sum: '$market_fee' } } },
          ])
          .toArray(),
        c
          .aggregate([
            {
              $match: { ...query },
            },
            { $group: { _id: null, totalPrice: { $sum: '$price' } } },
          ])
          .toArray(),
      ]);

    res.json({
      totalSales,
      totalPaidSales: totalSales - totalUnPaidSales,
      totalRoyaltyPaid: totalMarketFee[0]?.totalMarketFee ?? 0,
      totalPotentialRoyalty: (totalPrice[0]?.totalPrice ?? 0) * 0.01243243243,
    });
  });

  return app;
}

function parseNumberQueryParam(s: string, defaultVal: number): number {
  if (s === undefined || s === null) return defaultVal;
  const val = parseInt(s);
  if (isNaN(val)) return defaultVal;
  return val;
}

function getQueryParams(collectionSymbol: string, query: any) {
  const timeFrom = query.from as string;
  const timeTo = query.to as string;
  const paidSales = (query.paid as string) === 'true';

  return {
    collection_symbol: collectionSymbol,
    ...(timeFrom && timeTo
      ? {
          time: {
            $gte: timeFrom,
            $lte: timeTo,
          },
        }
      : timeFrom
      ? { time: { $gte: timeFrom } }
      : timeTo
      ? { time: { $lte: timeTo } }
      : null),
    ...(paidSales
      ? {
          royalty_fee: {
            $gt: 0,
          },
        }
      : null),
  };
}
