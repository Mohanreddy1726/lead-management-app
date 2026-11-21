const { MongoClient } = require("mongodb");

const URI = "mongodb://mohananika123:Anika123@ac-5emubdu-shard-00-00.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-01.0ckbv6x.mongodb.net:27017,ac-5emubdu-shard-00-02.0ckbv6x.mongodb.net:27017/gvkedutech?ssl=true&replicaSet=atlas-fbv8li-shard-0&authSource=admin&retryWrites=true&w=majority";

async function simulateWebsiteSubmission() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db("gvkedutech");

  const ts = Date.now().toString().slice(-4);
  console.log(`Simulating a fresh student submission on gvkedutech.com (ts: ${ts})...`);

  // Simulate a live student filling out the MBBS Abroad Google Ads form
  const newSubmission = {
    name: `Aanya Patel ${ts}`,
    fullName: `Aanya Patel ${ts}`,
    phone: `98490${ts}88`,
    email: `aanya.patel.${ts}@gmail.com`,
    neetScore: "460",
    country: "georgia",
    message: "Seeking admission in European University Georgia",
    createdAt: new Date(),
  };

  const res = await db.collection("mbbs_abroad_submissions").insertOne(newSubmission);
  console.log(`Inserted to gvkedutech mbbs_abroad_submissions with _id:`, res.insertedId);
  await client.close();

  // Now trigger sync via /api/leads
  console.log("Triggering /api/leads sync...");
  const apiRes = await fetch("http://localhost:3000/api/leads");
  const data = await apiRes.json();
  console.log(`Total leads now in CRM:`, data.total);
  console.log(`Top lead in CRM:`, data.leads[0].name, "| Source:", data.leads[0].source, "| Phone:", data.leads[0].phone, "| Country:", data.leads[0].country, "| Score:", data.leads[0].score);

  if (data.leads[0].name === `Aanya Patel ${ts}`) {
    console.log("SUCCESS! The new website lead was instantly captured and placed at the top of the CRM!");
  } else {
    console.error("Warning: Top lead is not the new submission.");
  }
}

simulateWebsiteSubmission().catch(console.error);
