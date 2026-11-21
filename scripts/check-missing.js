const { MongoClient } = require('../node_modules/mongodb');

const gvkUri = 'mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority';
const leadUri = 'mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority';

async function checkMissing() {
  const gvkClient = new MongoClient(gvkUri);
  await gvkClient.connect();
  const gvkDb = gvkClient.db('gvkedutech');

  const leadClient = new MongoClient(leadUri);
  await leadClient.connect();
  const leadDb = leadClient.db('leadmanagement');

  const existingIds = new Set((await leadDb.collection('leads').distinct('rawPayload.submissionId')).map(String));
  console.log('Existing distinct submissionIds in CRM:', existingIds.size);

  const cols = [
    'mbbs_abroad_submissions',
    'apply_submissions',
    'college_predictor_submissions',
    'budget_calculator_submissions',
    'smart_comparison_submissions',
    'roi_planner_submissions'
  ];

  let missingCount = 0;
  for (const c of cols) {
    const docs = await gvkDb.collection(c).find().toArray();
    for (const d of docs) {
      if (!existingIds.has(String(d._id))) {
        console.log(`Missing from ${c}: id=${d._id}, name=${d.name || d.fullName}`);
        missingCount++;
      }
    }
  }
  console.log('Total missing docs in website db not in CRM:', missingCount);

  await gvkClient.close();
  await leadClient.close();
}

checkMissing().catch(console.error);
