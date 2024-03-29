import { MongoClient } from 'mongodb';

export const client = new MongoClient(process.env.MONGO_URL!);

let connected = false;

export async function collection() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client.db('iroyalty').collection('sales');
}

export async function teardown() {
  await client.close();
  connected = false;
  return;
}
