export class ResponseError extends Error {
  status?: number;
}

export type Sale = {
  mint: string;
  price: number;
  market_fee: number;
  time: string;
  royalty_fee: number;
  buyer: string;
  seller: string;
  marketplace: string;
  signature: string;
  collection_symbol: string;
};
