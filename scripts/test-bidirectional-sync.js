const { MongoClient, ObjectId } = require('../node_modules/mongodb');

const gvkUri = 'mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority';

async function runTest() {
  const gvkClient = new MongoClient(gvkUri);
  await gvkClient.connect();
  const gvkDb = gvkClient.db('gvkedutech');

  console.log('--- STEP 1: Creating a test submission on website db (gvkedutech) ---');
  const insertRes = await gvkDb.collection('apply_submissions').insertOne({
    fullName: 'Test Automation BiDirectional Lead',
    phone: '9998887776',
    email: 'testautomation@gvkedutech.com',
    country: 'Kazakhstan',
    message: 'Testing bi-directional deletion sync',
    createdAt: new Date(),
  });
  const testSubId = insertRes.insertedId;
  console.log('Inserted with _id:', testSubId.toString());

  console.log('\n--- STEP 2: Triggering sync via API (GET /api/leads) ---');
  const fetch1 = await fetch('http://localhost:3000/api/leads');
  const json1 = await fetch1.json();
  const foundInApi1 = json1.leads.find(l => l.name === 'Test Automation BiDirectional Lead');
  console.log('Found in CRM API response:', !!foundInApi1, foundInApi1 ? foundInApi1.id : '');

  if (!foundInApi1) {
    throw new Error('Test lead was not imported into CRM!');
  }

  console.log('\n--- STEP 3: Deleting the test submission from website db (gvkedutech) ---');
  const delRes = await gvkDb.collection('apply_submissions').deleteOne({ _id: testSubId });
  console.log('Deleted from website db:', delRes.deletedCount === 1);

  console.log('\n--- STEP 4: Triggering sync again via API (GET /api/leads) ---');
  const fetch2 = await fetch('http://localhost:3000/api/leads');
  const json2 = await fetch2.json();
  const foundInApi2 = json2.leads.find(l => l.name === 'Test Automation BiDirectional Lead');
  console.log('Found in CRM API response after deletion:', !!foundInApi2);

  if (foundInApi2) {
    throw new Error('Test lead was NOT pruned from CRM after deletion in website db!');
  }

  console.log('\nSUCCESS! Bi-directional real-time creation and deletion synchronization is working perfectly!');

  await gvkClient.close();
}

runTest().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
