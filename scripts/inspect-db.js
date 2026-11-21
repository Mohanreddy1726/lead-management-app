const mongoose = require("mongoose");

const MONGODB_URI = "mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections in DB:", collections.map(c => c.name));

  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(` - ${c.name}: ${count} documents`);
  }

  if (collections.some(c => c.name === "users")) {
    const users = await mongoose.connection.db.collection("users").find().toArray();
    console.log("Users:", users.map(u => ({ email: u.email, name: u.name, role: u.role, branch: u.branch })));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
