const { MongoClient, ObjectId } = require('../node_modules/mongodb');

const gvkUri = 'mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority';
const leadUri = 'mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority';

async function check() {
  const gvkClient = new MongoClient(gvkUri);
  await gvkClient.connect();
  const gvkDb = gvkClient.db('gvkedutech');

  const leadClient = new MongoClient(leadUri);
  await leadClient.connect();
  const leadDb = leadClient.db('leadmanagement');

  const cols = [
    'mbbs_abroad_submissions',
    'apply_submissions',
    'college_predictor_submissions',
    'budget_calculator_submissions',
    'smart_comparison_submissions',
    'roi_planner_submissions'
  ];

  const allGvkIds = new Set();
  for (const c of cols) {
    const docs = await gvkDb.collection(c).find({}, { projection: { _id: 1 } }).toArray();
    for (const d of docs) {
      allGvkIds.add(String(d._id));
    }
  }

  console.log('Total valid submission IDs across all 6 collections:', allGvkIds.size);

  const leadsWithSubId = await leadDb.collection('leads').find(
    { 'rawPayload.submissionId': { $exists: true } },
    { projection: { name: 1, phone: 1, 'rawPayload.submissionId': 1 } }
  ).toArray();

  console.log('Total leads with rawPayload.submissionId in CRM:', leadsWithSubId.length);

  const orphaned = leadsWithSubId.filter(l => !allGvkIds.has(String(l.rawPayload.submissionId)));
  console.log('Orphaned leads (deleted in website, but still in CRM):', orphaned.length);
  for (const o of orphaned) {
    console.log(` - ${o.name} (${o.phone}), subId: ${o.rawPayload.submissionId}`);
  }

  await gvkClient.close();
  await leadClient.close();
}

check().catch(console.error);
