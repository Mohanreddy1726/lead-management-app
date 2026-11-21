const { MongoClient } = require('../node_modules/mongodb');

const gvkUri = 'mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority';
const leadUri = 'mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority';

async function testOptimizedSync() {
  const start = Date.now();
  const gvkClient = new MongoClient(gvkUri);
  await gvkClient.connect();
  const gvkDb = gvkClient.db('gvkedutech');

  const leadClient = new MongoClient(leadUri);
  await leadClient.connect();
  const leadDb = leadClient.db('leadmanagement');

  console.log('Connected in ms:', Date.now() - start);

  const t1 = Date.now();
  const existingIds = new Set(await leadDb.collection('leads').distinct('rawPayload.submissionId'));
  console.log(`Fetched ${existingIds.size} distinct submissionIds from CRM in ${Date.now() - t1}ms`);

  const collections = [
    'mbbs_abroad_submissions',
    'apply_submissions',
    'college_predictor_submissions',
    'budget_calculator_submissions',
    'smart_comparison_submissions',
    'roi_planner_submissions'
  ];

  const t2 = Date.now();
  const validIds = new Set();
  await Promise.all(collections.map(async (c) => {
    const docs = await gvkDb.collection(c).find({}, { projection: { _id: 1 } }).toArray();
    for (const d of docs) validIds.add(String(d._id));
  }));
  console.log(`Parallel scanned all 6 collections (${validIds.size} docs) in ${Date.now() - t2}ms`);

  const t3 = Date.now();
  const delRes = await leadDb.collection('leads').deleteMany({
    'rawPayload.submissionId': {
      $exists: true,
      $nin: Array.from(validIds)
    }
  });
  console.log(`Reconciled deletions (${delRes.deletedCount} deleted) in ${Date.now() - t3}ms`);

  console.log(`TOTAL OPTIMIZED SYNC TIME: ${Date.now() - start}ms`);

  await gvkClient.close();
  await leadClient.close();
}

testOptimizedSync().catch(console.error);
