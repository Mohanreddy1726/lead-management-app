const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://mohangvk456_db_user:mohanreddy1726@ac-6m4vnfb-shard-00-00.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-01.em3ukv7.mongodb.net:27017,ac-6m4vnfb-shard-00-02.em3ukv7.mongodb.net:27017/leadmanagement?ssl=true&replicaSet=atlas-beelxj-shard-0&authSource=admin&retryWrites=true&w=majority";

function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const PLACEHOLDER_NAMES = [
  "google ads inquirer",
  "applicant",
  "predictor student",
  "budget inquirer",
  "comparison inquirer",
  "roi inquirer",
  "lead",
];

function isRealName(name) {
  if (!name || !name.trim()) return false;
  const lower = name.trim().toLowerCase();
  return !PLACEHOLDER_NAMES.some((p) => lower.includes(p));
}

async function deduplicate() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const leadsCol = db.collection("leads");

  const totalBefore = await leadsCol.countDocuments();
  console.log(`Total leads in DB before deduplication: ${totalBefore}`);

  const allLeads = await leadsCol.find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();

  const groups = new Map();
  for (const lead of allLeads) {
    const norm = normalizePhone(lead.phone);
    if (!norm) continue;
    if (!groups.has(norm)) {
      groups.set(norm, []);
    }
    groups.get(norm).push(lead);
  }

  console.log(`Unique normalized phone numbers found: ${groups.size}`);

  let removedCount = 0;
  let updatedCount = 0;

  for (const [normPhone, list] of groups.entries()) {
    if (list.length <= 1) continue;

    // Pick the best record as primary
    // Prefer one with a real student name, or the most recently updated
    let primary = list.find((l) => isRealName(l.name)) || list[0];

    // Collect all data from duplicates
    const allSubmissionIds = new Set();
    const allTags = new Set(primary.tags || []);
    let bestNeetScore = primary.neetScore;
    let bestBudget = primary.budget;
    let bestParentName = primary.parentName;
    let bestUniversity = primary.university;
    let bestEmail = primary.email;
    let bestCity = primary.city;
    let bestState = primary.state;
    let bestCountry = primary.country;
    let bestCourse = primary.course;
    let bestAttribution = primary.attribution || {};

    const idsToDelete = [];

    for (const item of list) {
      if (item._id.toString() !== primary._id.toString()) {
        idsToDelete.push(item._id);
      }

      // Collect submission IDs
      if (item.rawPayload?.submissionId) {
        allSubmissionIds.add(String(item.rawPayload.submissionId));
      }
      if (Array.isArray(item.rawPayload?.allSubmissionIds)) {
        item.rawPayload.allSubmissionIds.forEach((id) => allSubmissionIds.add(String(id)));
      }

      // Merge tags
      if (Array.isArray(item.tags)) {
        item.tags.forEach((t) => allTags.add(t));
      }

      // Merge data fields
      if (!bestNeetScore && item.neetScore) bestNeetScore = item.neetScore;
      if ((!bestBudget || bestBudget.includes("Lakh") || bestBudget === "₹25 Lakh") && item.budget) {
        bestBudget = item.budget;
      }
      if (!bestParentName && item.parentName) bestParentName = item.parentName;
      if (!bestUniversity && item.university) bestUniversity = item.university;
      if ((!bestEmail || bestEmail.includes("@web-inquiry.com")) && item.email && !item.email.includes("@web-inquiry.com")) {
        bestEmail = item.email;
      }
      if ((!bestCity || bestCity === "Hyderabad") && item.city && item.city !== "Hyderabad") {
        bestCity = item.city;
      }
      if ((!bestState || bestState === "Telangana") && item.state && item.state !== "Telangana") {
        bestState = item.state;
      }
      if (item.country && item.country !== "Georgia" && item.country !== "Kazakhstan") {
        bestCountry = item.country;
      }
      if (item.course && item.course !== "MBBS Abroad") {
        bestCourse = item.course;
      }
      if (!bestAttribution.utmSource && item.attribution?.utmSource) {
        bestAttribution = item.attribution;
      }
    }

    // Update primary lead document with enriched data
    const rawPayload = primary.rawPayload || {};
    rawPayload.allSubmissionIds = Array.from(allSubmissionIds);
    rawPayload.submissionCount = list.length;

    await leadsCol.updateOne(
      { _id: primary._id },
      {
        $set: {
          tags: Array.from(allTags),
          neetScore: bestNeetScore,
          budget: bestBudget,
          parentName: bestParentName,
          university: bestUniversity,
          email: bestEmail,
          city: bestCity,
          state: bestState,
          country: bestCountry,
          course: bestCourse,
          attribution: bestAttribution,
          rawPayload,
          updatedAt: new Date(),
        },
      }
    );
    updatedCount++;

    // Remove duplicates
    if (idsToDelete.length > 0) {
      const delRes = await leadsCol.deleteMany({ _id: { $in: idsToDelete } });
      removedCount += delRes.deletedCount || 0;
    }
  }

  const totalAfter = await leadsCol.countDocuments();
  console.log(`\nDeduplication Summary:`);
  console.log(`- Total before: ${totalBefore}`);
  console.log(`- Enriched primary leads: ${updatedCount}`);
  console.log(`- Duplicate records deleted: ${removedCount}`);
  console.log(`- Total unique leads remaining in DB: ${totalAfter}`);

  await mongoose.disconnect();
}

deduplicate().catch((err) => {
  console.error("Deduplication error:", err);
  process.exit(1);
});
