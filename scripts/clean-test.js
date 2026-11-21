const mongoose = require("mongoose");
const { MongoClient } = require("mongodb");

async function main() {
  await mongoose.connect("mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority");
  await mongoose.connection.db.collection("leads").deleteMany({ name: { $regex: /Aanya Patel/ } });
  await mongoose.disconnect();

  const client = new MongoClient("mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority");
  await client.connect();
  await client.db("gvkedutech").collection("mbbs_abroad_submissions").deleteMany({ name: { $regex: /Aanya Patel/ } });
  await client.close();
  console.log("Cleaned test lead.");
}

main().catch(console.error);
