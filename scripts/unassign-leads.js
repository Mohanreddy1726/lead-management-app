const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const leadsCol = mongoose.connection.db.collection("leads");
  const res = await leadsCol.updateMany({}, { $set: { assignedTo: null } });
  console.log("Set assignedTo: null on leads count:", res.modifiedCount);
  await mongoose.disconnect();
}

main().catch(console.error);
