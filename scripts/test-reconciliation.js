const { MongoClient } = require('../node_modules/mongodb');

const gvkUri = 'mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority';
const leadUri = 'mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority';

async function testReconciliation() {
  const gvkClient = new MongoClient(gvkUri);
  await gvkClient.connect();
  const gvkDb = gvkClient.db('gvkedutech');

  const leadClient = new MongoClient(leadUri);
  await leadClient.connect();
  const leadDb = leadClient.db('leadmanagement');

  const collections = [
    'mbbs_abroad_submissions',
    'apply_submissions',
    'college_predictor_submissions',
    'budget_calculator_submissions',
    'smart_comparison_submissions',
    'roi_planner_submissions'
  ];

  const validIds = new Set();
  let querySuccess = 0;
  for (const c of collections) {
    try {
      const docs = await gvkDb.collection(c).find({}, { projection: { _id: 1 } }).toArray();
      for (const d of docs) {
        validIds.add(String(d._id));
      }
      querySuccess++;
    } catch (e) {
      console.error('Error fetching ids from', c, e);
    }
  }

  console.log(`Scanned ${querySuccess}/${collections.length} collections. Total valid website submission IDs: ${validIds.size}`);

  if (querySuccess === collections.length && validIds.size > 0) {
    const toDelete = await leadDb.collection('leads').find({
      'rawPayload.submissionId': {
        $exists: true,
        $nin: Array.from(validIds)
      }
    }).toArray();

    console.log(`Found ${toDelete.length} orphaned leads to delete:`);
    toDelete.forEach(l => console.log(` - [${l._id}] ${l.name} (${l.phone}) subId: ${l.rawPayload.submissionId}`));

    const res = await leadDb.collection('leads').deleteMany({
      'rawPayload.submissionId': {
        $exists: true,
        $nin: Array.from(validIds)
      }
    });

    console.log(`Deleted count: ${res.deletedCount}`);
    const remaining = await leadDb.collection('leads').countDocuments();
    console.log(`Remaining leads in CRM: ${remaining}`);
  }

  await gvkClient.close();
  await leadClient.close();
}

testReconciliation().catch(console.error);
