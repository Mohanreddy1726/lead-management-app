import type {
  Admission, Application, AuditEntry, AutomationRule, CallLog, CallScript,
  Campaign, DocumentItem, FollowUp, Lead, LeadSource, LeadStage, LeadStatus,
  NotificationItem, Payment, SavedView, TeamMember, Telecaller, TimelineEvent, Branch,
} from "./types";



function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260926);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]!;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

export const TODAY = new Date("2026-09-26T10:45:00");

const firstNames = ["Rahul","Ananya","Arjun","Sneha","Sai Kiran","Priya","Harshitha","Aditya","Nikhil","Pooja","Varun","Keerthi","Manish","Divya","Rohit","Lakshmi","Vamsi","Sruthi","Karthik","Meghana"];
const lastNames = ["Sharma","Reddy","Kumar","Rao","Varma","Singh","Naidu","Patel","Chowdary","Yadav"];

export const CITIES = [
  { city: "Hyderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Karimnagar", state: "Telangana" },
  { city: "Nizamabad", state: "Telangana" },
  { city: "Guntur", state: "Andhra Pradesh" },
];

export const SOURCES: LeadSource[] = ["Website","Meta Ads","Google Ads","WhatsApp","Manual","CSV Import"];
export const STAGES: LeadStage[] = ["New","Assigned","Contacted","Interested","Counselling","Application","Documentation","Admission","Converted"];
export const STATUSES: LeadStatus[] = ["New","Contacted","Interested","Not Interested","Follow-up","Unreachable","Lost","Converted"];
export const COURSES = ["MBBS Abroad","Masters Abroad","BDS Abroad","MD Abroad"];
export const COUNTRIES = ["Kazakhstan","Georgia","Russia","Kyrgyzstan","Uzbekistan","UK","USA","Germany"];
export const UNIVERSITIES = ["David Tvildiani Medical University","Kazakh National Medical University","Tbilisi State Medical University","Osh State University","Samarkand State Medical University","University of Leeds","Technical University of Munich"];
export const TAGS = ["Hot","Parent Interested","NEET Qualified","High Budget","Kazakhstan","Georgia","Urgent","Scholarship","Follow-up Required"];

export const SCORING_RULES = [
  { label: "Academic eligibility", points: 20 },
  { label: "Strong course interest", points: 20 },
  { label: "Budget confirmed", points: 15 },
  { label: "Parent involved", points: 15 },
  { label: "Follow-up responsive", points: 10 },
  { label: "Counselling completed", points: 10 },
  { label: "Documents submitted", points: 10 },
];

export function scoreBand(score: number) {
  if (score >= 90) return "Very High";
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export const managers: TeamMember[] = [];

export const telecallers: Telecaller[] = [];

export const teamMembers: TeamMember[] = [];

export const currentUser = { name: "Admin", role: "Admin" as const, initials: "AD", team: "Headquarters", status: "Active" };


export const campaigns: Campaign[] = [
  // MBBS Campaigns
  { id: "cmp-1", name: "MBBS Kazakhstan 2026", source: "Meta Ads", status: "Active", branch: "mbbs", startDate: "2026-06-01", endDate: "2026-12-31", budget: 400000, spend: 250000, leads: 320, qualified: 148, applications: 28, admissions: 11, revenue: 2860000 },
  { id: "cmp-2", name: "MBBS Georgia Intake", source: "Google Ads", status: "Active", branch: "mbbs", startDate: "2026-05-15", endDate: "2026-11-30", budget: 320000, spend: 208000, leads: 244, qualified: 106, applications: 21, admissions: 8, revenue: 1960000 },
  { id: "cmp-4", name: "NEET Counselling Webinar", source: "Website", status: "Active", branch: "mbbs", startDate: "2026-08-01", endDate: "2026-10-15", budget: 120000, spend: 74000, leads: 163, qualified: 82, applications: 14, admissions: 7, revenue: 1540000 },
  { id: "cmp-5", name: "WhatsApp Enquiry Funnel", source: "WhatsApp", status: "Active", branch: "mbbs", startDate: "2026-03-01", endDate: "2026-12-31", budget: 90000, spend: 46000, leads: 132, qualified: 61, applications: 11, admissions: 5, revenue: 1100000 },
  { id: "cmp-6", name: "Kyrgyzstan Spring Push", source: "Meta Ads", status: "Paused", branch: "mbbs", startDate: "2026-01-10", endDate: "2026-05-30", budget: 180000, spend: 178000, leads: 148, qualified: 49, applications: 8, admissions: 3, revenue: 660000 },

  // Masters Campaigns (Meta Ad Account dedicated to Masters, plus some search/web)
  { id: "cmp-3", name: "Masters Germany Fall", source: "Meta Ads", status: "Active", branch: "masters", startDate: "2026-04-01", endDate: "2026-10-31", budget: 280000, spend: 194000, leads: 210, qualified: 88, applications: 18, admissions: 7, revenue: 1620000 },
  { id: "cmp-7", name: "Masters UK & Ireland 2026", source: "Meta Ads", status: "Active", branch: "masters", startDate: "2026-05-01", endDate: "2026-11-30", budget: 350000, spend: 210000, leads: 260, qualified: 110, applications: 25, admissions: 9, revenue: 2150000 },
  { id: "cmp-8", name: "MS in USA - STEM Programs", source: "Meta Ads", status: "Active", branch: "masters", startDate: "2026-04-15", endDate: "2026-12-15", budget: 420000, spend: 290000, leads: 310, qualified: 135, applications: 32, admissions: 12, revenue: 2980000 },
  { id: "cmp-9", name: "Masters Abroad Direct Website", source: "Website", status: "Active", branch: "masters", startDate: "2026-03-01", endDate: "2026-12-31", budget: 100000, spend: 52000, leads: 145, qualified: 68, applications: 15, admissions: 6, revenue: 1450000 },
];

const phoneFor = (i: number) => `+91 9${String(800000000 + i * 137711).slice(0, 9)}`;

function buildScore(seedScore: number) {
  let remaining = seedScore;
  return SCORING_RULES.map((rule) => {
    const earned = remaining >= rule.points && rand() > 0.25;
    if (earned) remaining -= rule.points;
    return { label: rule.label, points: rule.points, earned };
  });
}

function makeLead(i: number): Lead {
  const isMasters = i % 3 === 0;
  const branch: Branch = isMasters ? "masters" : "mbbs";
  const first = pick(firstNames);
  const last = pick(lastNames);
  const loc = pick(CITIES);

  const mbbsCampaigns = campaigns.filter((c) => c.branch === "mbbs");
  const mastersCampaigns = campaigns.filter((c) => c.branch === "masters");
  const branchCampaigns = isMasters ? mastersCampaigns : mbbsCampaigns;

  const branchTelecallers = telecallers.filter((t) => t.branch === branch);

  // User requirement: "mostly masters leads are from META ads"
  const source: LeadSource = isMasters
    ? pick(["Meta Ads", "Meta Ads", "Meta Ads", "Website", "Google Ads"] as LeadSource[])
    : pick(SOURCES);

  const campaign = source === "Manual" || source === "CSV Import" ? null : pick(branchCampaigns).id;
  const stageIdx = int(0, 8);
  const stage = STAGES[stageIdx]!;
  const score = int(25, 98);
  const assigned = stageIdx === 0 && rand() < 0.6 ? null : pick(branchTelecallers).id;
  const createdDay = int(1, 40);
  const created = new Date(TODAY.getTime() - createdDay * 86400000 - int(0, 20) * 3600000);
  const status: LeadStatus =
    stage === "Converted" ? "Converted"
    : stage === "New" ? "New"
    : stage === "Contacted" ? pick(["Contacted", "Follow-up", "Unreachable"] as LeadStatus[])
    : stage === "Assigned" ? "New"
    : pick(["Interested", "Follow-up", "Contacted"] as LeadStatus[]);
  const followUpOffset = int(-4, 9);

  const course = isMasters ? "Masters Abroad" : pick(["MBBS Abroad", "BDS Abroad", "MD Abroad"]);
  const country = isMasters ? pick(["Germany", "UK", "USA"]) : pick(["Kazakhstan", "Georgia", "Russia", "Kyrgyzstan", "Uzbekistan"]);
  const university = isMasters
    ? pick(["Technical University of Munich", "University of Leeds", "RWTH Aachen", "Arizona State University", "University of Manchester"])
    : rand() > 0.5 ? pick(UNIVERSITIES) : undefined;

  const tags = isMasters
    ? Array.from(new Set([pick(["Hot", "High Budget", "GRE 320+", "IELTS 7.5+", "Scholarship Applicant", "Fall Intake"]), pick(TAGS)])).slice(0, 2)
    : Array.from(new Set([pick(TAGS), pick(TAGS)])).slice(0, rand() > 0.5 ? 2 : 1);

  return {
    id: `GVK-2026-00${1000 + i}`,
    name: `${first} ${last}`,
    phone: phoneFor(i),
    email: `${first.toLowerCase().replace(/\s/g, "")}.${last.toLowerCase()}${i}@gmail.com`,
    city: loc.city,
    state: loc.state,
    source,
    campaignId: campaign,
    course,
    country,
    university,
    score,
    scoreBreakdown: buildScore(score),
    assignedTo: assigned,
    stage,
    status,
    tags,
    nextFollowUp: assigned && rand() > 0.35 ? new Date(TODAY.getTime() + followUpOffset * 86400000 + int(9, 18) * 3600000).toISOString() : null,
    createdAt: created.toISOString(),
    neetScore: isMasters ? undefined : int(140, 620),
    budget: isMasters ? pick(["₹28–35 L", "₹35 L+", "₹40 L–50 L"]) : pick(["₹18–22 L", "₹22–28 L", "₹28–35 L"]),
    parentName: `${pick(["Suresh", "Ramesh", "Venkat", "Anil", "Prakash"])} ${last}`,
    branch,
    attribution: {
      adSet: isMasters ? `${loc.city} Techies & Grads — ${pick(["21-25", "24-28"])}` : `${pick(["Telangana", "AP", "Lookalike 2%", "Retargeting"])} — ${pick(["18-24", "24-30"])}`,
      ad: isMasters ? `Creative ${int(1, 8)} — ${pick(["MS Germany Reel", "US STEM OPT Carousel", "Alumni Success Story"])}` : `Creative ${int(1, 12)} — ${pick(["Fee Carousel", "Campus Video", "Student Story"])}`,
      landingPage: isMasters ? `/${pick(["masters-germany", "masters-usa", "masters-uk"])}` : `/${pick(["mbbs-kazakhstan", "mbbs-georgia", "neet-counselling"])}`,
      utmSource: source.toLowerCase().replace(" ", "_"),
      utmMedium: source.includes("Ads") ? "cpc" : "organic",
      utmCampaign: campaign ? (campaigns.find((c) => c.id === campaign)?.name ?? "direct") : "direct",
      utmTerm: isMasters ? pick(["ms germany", "masters in usa stem", "fall 2026 ms cs", "gre waiver masters"]) : pick(["mbbs abroad", "low fee mbbs", "neet 300 mbbs"]),
      utmContent: pick(["carousel_a", "video_b", "static_c"]),
    },
  };
}

const heroLead: Lead = {
  id: "GVK-2026-001248", name: "Rahul Sharma", phone: "+91 98480 21248", email: "rahul.sharma@gmail.com",
  city: "Hyderabad", state: "Telangana", source: "Meta Ads", campaignId: "cmp-1",
  course: "MBBS Abroad", country: "Kazakhstan", university: "Kazakh National Medical University",
  score: 82, scoreBreakdown: SCORING_RULES.map((r) => ({ ...r, earned: r.label !== "Documents submitted" && r.label !== "Follow-up responsive" ? true : r.label === "Follow-up responsive" })),
  assignedTo: "tc-1", stage: "Admission", status: "Converted",
  tags: ["Hot", "NEET Qualified", "Parent Interested"],
  nextFollowUp: new Date(TODAY.getTime() + 2 * 86400000).toISOString(),
  createdAt: "2026-09-26T09:42:00", neetScore: 412, budget: "₹22–28 L", parentName: "Suresh Sharma",
  attribution: { adSet: "Telangana — 18-24", ad: "Creative 4 — Fee Carousel", landingPage: "/mbbs-kazakhstan", utmSource: "meta_ads", utmMedium: "cpc", utmCampaign: "MBBS Kazakhstan 2026", utmTerm: "low fee mbbs kazakhstan", utmContent: "carousel_a" },
  branch: "mbbs",
};

export const heroMastersLead: Lead = {
  id: "GVK-2026-002001", name: "Aditya Varma", phone: "+91 98480 55112", email: "aditya.varma@gmail.com",
  city: "Hyderabad", state: "Telangana", source: "Meta Ads", campaignId: "cmp-7",
  course: "Masters Abroad", country: "Germany", university: "Technical University of Munich",
  score: 88, scoreBreakdown: SCORING_RULES.map((r) => ({ ...r, earned: true })),
  assignedTo: "tc-5", stage: "Admission", status: "Converted",
  tags: ["Hot", "High Budget", "GRE 320+"],
  nextFollowUp: new Date(TODAY.getTime() + 1 * 86400000).toISOString(),
  createdAt: "2026-09-26T08:15:00", budget: "₹35 L+", parentName: "Raghav Varma",
  attribution: { adSet: "Hyderabad Techies — 22-28", ad: "MS Germany Winter Intake", landingPage: "/masters-germany", utmSource: "meta_ads", utmMedium: "cpc", utmCampaign: "Masters UK & Ireland 2026", utmTerm: "ms computer science germany", utmContent: "masters_reel_1" },
  branch: "masters",
};

export const leads: Lead[] = [];

export const heroTimeline: TimelineEvent[] = [];

export const heroMastersTimeline: TimelineEvent[] = [];


function genericTimeline(lead: Lead): TimelineEvent[] {
  const base = new Date(lead.createdAt).getTime();
  const events: TimelineEvent[] = [{ id: `${lead.id}-1`, leadId: lead.id, at: new Date(base).toISOString(), type: "created", title: "Lead Created", detail: `Captured from ${lead.source}`, meta: { Source: lead.source } }];
  if (lead.assignedTo) events.push({ id: `${lead.id}-2`, leadId: lead.id, at: new Date(base + 3600000).toISOString(), type: "assigned", title: "Lead Assigned", actor: telecallers.find((t) => t.id === lead.assignedTo)?.name });
  const idx = STAGES.indexOf(lead.stage);
  if (idx >= 2) events.push({ id: `${lead.id}-3`, leadId: lead.id, at: new Date(base + 2 * 86400000).toISOString(), type: "call", title: "Call Connected", detail: `Outcome: ${lead.status}`, actor: telecallers.find((t) => t.id === lead.assignedTo)?.name });
  if (idx >= 4) events.push({ id: `${lead.id}-4`, leadId: lead.id, at: new Date(base + 5 * 86400000).toISOString(), type: "counselling", title: "Counselling Completed", detail: `${lead.course} · ${lead.country}` });
  if (idx >= 5) events.push({ id: `${lead.id}-5`, leadId: lead.id, at: new Date(base + 9 * 86400000).toISOString(), type: "application", title: "Application Submitted", detail: lead.university ?? "University shortlist finalised" });
  if (idx >= 7) events.push({ id: `${lead.id}-6`, leadId: lead.id, at: new Date(base + 16 * 86400000).toISOString(), type: "admission", title: "Admission Confirmed" });
  return events.reverse();
}

export function timelineFor(leadId: string): TimelineEvent[] {
  if (leadId === heroLead.id) return [...heroTimeline].reverse();
  if (leadId === heroMastersLead.id) return [...heroMastersTimeline].reverse();
  const lead = leads.find((l) => l.id === leadId);
  return lead ? genericTimeline(lead) : [];
}

export const callOutcomes = ["Connected","No Answer","Busy","Call Back","Interested","Not Interested","Wrong Number","Parent Discussion Required"];

export const calls: CallLog[] = leads.slice(0, 60).map((lead, i) => ({
  id: `call-${i}`, leadId: lead.id, telecallerId: lead.assignedTo ?? "tc-1",
  date: new Date(TODAY.getTime() - int(0, 5) * 86400000 - int(0, 8) * 3600000).toISOString(),
  duration: `${int(0, 12)}m ${int(10, 59)}s`,
  outcome: pick(callOutcomes),
  notes: pick(["Parent requested complete fee structure.","Student asked about hostel and food facilities.","Wants to compare Georgia and Kazakhstan options.","Requested call back after NEET result discussion.","Documents pending from student side."]),
  nextAction: pick(["Share fee structure","Schedule counselling","Call parent","Send university brochure"]),
}));

export const followUps: FollowUp[] = leads.filter((l) => l.nextFollowUp).slice(0, 48).map((lead, i) => {
  const date = new Date(lead.nextFollowUp!);
  const status: FollowUp["status"] = date.getTime() < TODAY.getTime() ? (rand() > 0.5 ? "Overdue" : "Completed") : "Pending";
  return { id: `fu-${i}`, leadId: lead.id, telecallerId: lead.assignedTo ?? "tc-1", date: lead.nextFollowUp!, reason: pick(["Fee discussion","Parent discussion","Document collection","Counselling reminder","Application follow-up","Offer letter update"]), priority: pick(["High","Medium","Low"] as const), status };
});

export const DOCUMENT_NAMES = ["Passport","10th Certificate","12th Certificate","NEET Scorecard","Passport Photos","Medical Documents","Application Form","University Documents","Visa Documents"];

export function documentsFor(leadId: string): DocumentItem[] {
  const lead = leads.find((l) => l.id === leadId);
  const idx = lead ? STAGES.indexOf(lead.stage) : 0;
  const completed = Math.min(9, Math.max(0, idx - 1) + (leadId === heroLead.id ? 3 : 0));
  return DOCUMENT_NAMES.map((name, i) => ({
    leadId, name,
    status: i < completed - 2 ? "Verified" : i < completed ? "Received" : i === completed ? "Requested" : "Not Requested",
    updatedAt: i < completed ? new Date(TODAY.getTime() - (9 - i) * 86400000).toISOString() : undefined,
  }));
}

const appStages: Application["stage"][] = ["Application Pending","Application Started","Documents Pending","Documents Verified","Submitted","University Processing","Offer Received","Admission"];

export const applications: Application[] = leads.filter((l) => STAGES.indexOf(l.stage) >= 5).map((lead, i) => ({
  id: `APP-2026-${2000 + i}`, leadId: lead.id, university: lead.university ?? UNIVERSITIES[i % UNIVERSITIES.length]!,
  country: lead.country, course: lead.course,
  stage: lead.id === heroLead.id ? "Admission" : appStages[int(0, 7)]!,
  owner: telecallers.find((t) => t.id === lead.assignedTo)?.name ?? "Priya Sharma",
  updatedAt: new Date(TODAY.getTime() - int(0, 14) * 86400000).toISOString(),
  intake: pick(["Nov 2026","Feb 2027","Sep 2027"]),
}));

export const admissions: Admission[] = leads.filter((l) => STAGES.indexOf(l.stage) >= 7).map((lead, i) => ({
  id: `ADM-2026-${3000 + i}`, leadId: lead.id, university: lead.university ?? UNIVERSITIES[i % UNIVERSITIES.length]!,
  country: lead.country, course: lead.course,
  admissionDate: new Date(TODAY.getTime() - int(1, 40) * 86400000).toISOString(),
  stage: lead.id === heroLead.id ? "Pre-Departure" : pick(["Offer Received","Admission Confirmed","Fee Payment","Pre-Departure","Completed"] as const),
  counsellor: telecallers.find((t) => t.id === lead.assignedTo)?.name ?? "Anjali Rao",
  feeStatus: pick(["Pending","Partial","Paid"] as const),
}));

const feeHeads: Payment["head"][] = ["University Fee","Consultancy Fee","Visa Fee","Hostel Fee","Other Charges"];

export function paymentsFor(leadId: string): Payment[] {
  const seeds = [1400000,150000,90000,180000,30000];
  return feeHeads.map((head, i) => {
    const total = seeds[i]!;
    const paid = leadId === heroLead.id ? [600000,150000,0,50000,0][i]! : Math.round(total * (i < 2 ? 0.5 : 0));
    return { id: `${leadId}-pay-${i}`, leadId, head, total, paid, dueDate: new Date(TODAY.getTime() + (i + 1) * 12 * 86400000).toISOString(), status: paid >= total ? "Paid" : paid > 0 ? "Partial" : i === 4 ? "Overdue" : "Pending" };
  });
}

export const payments: Payment[] = admissions.flatMap((a) => paymentsFor(a.leadId));

export const notifications: NotificationItem[] = [];

export const activityFeed: { at: string; text: string; type: string }[] = [];

export const auditLog: AuditEntry[] = [];

export const leadSources = SOURCES.map((source) => {
  const list = leads.filter((l) => l.source === source);
  const stageAtLeast = (n: number) => list.filter((l) => STAGES.indexOf(l.stage) >= n).length;
  return { name: source, enabled: true, leads: list.length, contacted: stageAtLeast(2), interested: stageAtLeast(3), applications: stageAtLeast(5), admissions: stageAtLeast(7) };
});

export const funnelStages = [
  { stage: "New Leads", value: 0 },
  { stage: "Assigned", value: 0 },
  { stage: "Contacted", value: 0 },
  { stage: "Interested", value: 0 },
  { stage: "Counselling", value: 0 },
  { stage: "Application", value: 0 },
  { stage: "Documentation", value: 0 },
  { stage: "Admission", value: 0 },
  { stage: "Converted", value: 0 },
];

export const kpis = [
  { key: "total", label: "Total Leads", value: 0, trend: 0, icon: "users" },
  { key: "new", label: "New Leads", value: 0, trend: 0, icon: "sparkles" },
  { key: "unassigned", label: "Unassigned", value: 0, trend: 0, icon: "userx" },
  { key: "assigned", label: "Assigned", value: 0, trend: 0, icon: "usercheck" },
  { key: "followups", label: "Follow-ups Today", value: 0, trend: 0, icon: "calendar" },
  { key: "interested", label: "Interested", value: 0, trend: 0, icon: "heart" },
  { key: "applications", label: "Applications", value: 0, trend: 0, icon: "filetext" },
  { key: "admissions", label: "Admissions", value: 0, trend: 0, icon: "graduation" },
];


export const savedViews: SavedView[] = [
  { id: "sv1", name: "My Hot Leads", filters: { assigned: "tc-1", minScore: "70", status: "Interested" } },
  { id: "sv2", name: "Overdue Follow-ups", filters: { followUp: "overdue" } },
  { id: "sv3", name: "Unassigned Leads", filters: { assigned: "none" } },
  { id: "sv4", name: "Meta Ads — Kazakhstan", filters: { source: "Meta Ads", country: "Kazakhstan" } },
];

export const assignmentRules = [
  { id: "rule-1", name: "Round Robin — Hyderabad Team", type: "Round Robin", scope: "All web leads", enabled: true },
  { id: "rule-2", name: "Least Assigned — Overflow", type: "Least Assigned", scope: "When queue > 20", enabled: true },
  { id: "rule-3", name: "Meta leads → Team A", type: "Source Based", scope: "Source = Meta Ads", enabled: true },
  { id: "rule-4", name: "Google leads → Team B", type: "Source Based", scope: "Source = Google Ads", enabled: false },
  { id: "rule-5", name: "Hyderabad → Hyderabad Team", type: "Location Based", scope: "City = Hyderabad", enabled: true },
  { id: "rule-6", name: "Warangal → Warangal Team", type: "Location Based", scope: "City = Warangal", enabled: true },
];

export const automationRules: AutomationRule[] = [
  { id: "ar1", name: "Application stage alert", when: "Lead Stage = Application", then: ["Create Follow-up","Notify Manager"], enabled: true, runs: 128 },
  { id: "ar2", name: "Unassigned lead escalation", when: "Lead remains unassigned for 30 minutes", then: ["Notify Manager","Flag in Lead Operations"], enabled: true, runs: 46 },
  { id: "ar3", name: "Overdue follow-up nudge", when: "Follow-up becomes overdue", then: ["Notify Telecaller","Raise priority to High"], enabled: true, runs: 311 },
  { id: "ar4", name: "Admission confirmation broadcast", when: "Admission confirmed", then: ["Notify Manager","Notify Admin","Add to Admissions board"], enabled: false, runs: 22 },
];

export const callScripts: CallScript[] = [
  { id: "cs1", title: "First Call — MBBS Abroad", category: "First Call", steps: ["Greeting and introduction","Understand student's academic background","Ask NEET score","Ask preferred country (Kazakhstan, Georgia, Russia)","Ask budget range","Explain suitable options","Schedule counselling"] },
  { id: "cs2", title: "Follow-up — Undecided MBBS Student", category: "Follow-up", steps: ["Recap previous discussion","Ask what is pending in decision","Address top 2 objections (food, climate, MCI/NMC pass rate)","Share comparison sheet","Confirm next step and date"] },
  { id: "cs3", title: "First Call — Masters Abroad (STEM / MBA)", category: "First Call", steps: ["Greeting and profile evaluation","Understand B.Tech/Graduation CGPA & Major","Check GRE / GMAT / IELTS / TOEFL status","Discuss preferred country (Germany, USA, UK)","Review intake deadlines (Fall vs Spring)","Schedule 1-on-1 profile evaluation"] },
  { id: "cs4", title: "Follow-up — Masters SOP & University Shortlist", category: "Follow-up", steps: ["Review university shortlist and eligibility","Check SOP / LOR draft status","Clarify blocked account & visa fund proof","Confirm university application submission date"] },
];

export const duplicateGroups: any[] = [];

export const scheduleEvents: any[] = [];

export const counsellingRecords: any[] = [];



export const geoDistribution = CITIES.map((c) => ({
  city: c.city,
  leads: leads.filter((l) => l.city === c.city).length,
  admissions: admissions.filter((a) => leads.find((l) => l.id === a.leadId)?.city === c.city).length,
}));

export const journeyStages = ["Lead","Counselling","University Selection","Application","Documents","Offer","Admission","Fee Payment","Pre-Departure","Completed"];
