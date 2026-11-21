const { MongoClient } = require("mongodb");

const URI = "mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(URI);
  await client.connect();
  const docs = await client.db("gvkedutech").collection("apply_submissions").find().sort({ createdAt: -1, _id: -1 }).limit(5).toArray();
  console.log("Recent apply_submissions:", JSON.stringify(docs, null, 2));
  await client.close();
}

main().catch(console.error);
