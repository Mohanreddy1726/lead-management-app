const mongoose = require("mongoose");

const MONGODB_URI = "mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority";

async function clearLeads() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");
  const res = await mongoose.connection.db.collection("leads").deleteMany({});
  console.log(`Deleted ${res.deletedCount} dummy/test leads from MongoDB 'leads' collection.`);

  // Also clear dummy whatsapp messages if any
  const resWa = await mongoose.connection.db.collection("whatsappmessages").deleteMany({});
  console.log(`Deleted ${resWa.deletedCount} test whatsapp messages.`);

  const remainingLeads = await mongoose.connection.db.collection("leads").countDocuments();
  console.log(`Remaining leads in DB: ${remainingLeads}`);

  await mongoose.disconnect();
}

clearLeads().catch(console.error);
