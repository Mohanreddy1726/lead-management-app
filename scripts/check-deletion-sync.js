const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");

const GVK_URI = "mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority";
const CRM_URI = "mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority";

async function main() {
  const gvkClient = new MongoClient(GVK_URI);
  await gvkClient.connect();
  const gvkDb = gvkClient.db("gvkedutech");

  const colls = [
    "mbbs_abroad_submissions",
    "apply_submissions",
    "college_predictor_submissions",
    "budget_calculator_submissions",
    "smart_comparison_submissions",
    "roi_planner_submissions",
  ];

  console.log("=== WEBSITE DATABASE (gvkedutech) ===");
  const allWebsiteSubmissionIds = new Set();
  for (const c of colls) {
    const docs = await gvkDb.collection(c).find().toArray();
    console.log(`Collection ${c}: ${docs.length} documents`);
    docs.forEach(d => allWebsiteSubmissionIds.add(String(d._id)));
  }

  // Check if testing/Mohan/Mohan reddy exist in gvkedutech
  for (const c of colls) {
    const testDocs = await gvkDb.collection(c).find({
      $or: [
        { name: { $regex: /testing|Mohan/i } },
        { fullName: { $regex: /testing|Mohan/i } },
        { phone: { $regex: /9885852424/ } }
      ]
    }).toArray();
    if (testDocs.length > 0) {
      console.log(`Found in gvkedutech.${c}:`, testDocs.map(d => ({ id: d._id, name: d.name || d.fullName, phone: d.phone })));
    }
  }

  await gvkClient.close();

  console.log("\n=== CRM DATABASE (leadmanagement) ===");
  await mongoose.connect(CRM_URI);
  const crmLeads = await mongoose.connection.db.collection("leads").find().sort({ createdAt: -1 }).toArray();
  console.log(`Total leads in CRM: ${crmLeads.length}`);
  const topCrm = crmLeads.slice(0, 10).map(l => ({
    id: l.leadId,
    name: l.name,
    phone: l.phone,
    submissionId: l.rawPayload?.submissionId,
    inWebsiteDb: allWebsiteSubmissionIds.has(String(l.rawPayload?.submissionId))
  }));
  console.log("Recent CRM Leads:", JSON.stringify(topCrm, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
