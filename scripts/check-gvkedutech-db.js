const { MongoClient } = require("mongodb");

const URI = "mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db("gvkedutech");
  const cols = await db.listCollections().toArray();
  console.log("GVKEDUTECH collections:", cols.map(c => c.name));

  for (const c of cols) {
    if (c.name.includes("submission") || c.name.includes("lead") || c.name.includes("apply") || c.name.includes("mbbs")) {
      const coll = db.collection(c.name);
      const count = await coll.countDocuments();
      const latest = await coll.find().sort({ createdAt: -1, _id: -1 }).limit(1).toArray();
      console.log(`\nCollection [${c.name}] (${count} total):`);
      if (latest[0]) {
        console.log("Latest doc:", JSON.stringify(latest[0], null, 2));
      }
    }
  }
  await client.close();
}

main().catch(console.error);
