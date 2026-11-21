const { MongoClient } = require('../node_modules/mongodb');

const uri = 'mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority';

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('leadmanagement');
  const leads = await db.collection('leads').find(
    { 'rawPayload.submissionId': { $exists: true } },
    { projection: { name: 1, phone: 1, 'rawPayload.submissionId': 1 } }
  ).toArray();
  console.log('Count with submissionId:', leads.length);
  for (const l of leads) {
    console.log(l.name, l.phone, l.rawPayload.submissionId);
  }
  await client.close();
}

run().catch(console.error);
