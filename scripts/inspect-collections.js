const { MongoClient } = require("mongodb");

const URI = "mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db("gvkedutech");

  const colls = [
    "mbbs_abroad_submissions",
    "college_predictor_submissions",
    "budget_calculator_submissions",
    "smart_comparison_submissions",
    "roi_planner_submissions",
    "apply_submissions",
  ];

  for (const c of colls) {
    const coll = db.collection(c);
    const sample = await coll.find().sort({ _id: -1 }).limit(1).toArray();
    console.log(`\n=== Collection: ${c} ===`);
    console.log(sample[0] ? Object.keys(sample[0]) : "Empty");
    if (sample[0]) console.log(JSON.stringify(sample[0], null, 2));
  }

  await client.close();
}

main().catch(console.error);
