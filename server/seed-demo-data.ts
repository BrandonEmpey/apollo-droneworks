/**
 * Apollo DroneWorks — comprehensive demo-data seed.
 * Removes all placeholder records and populates: customers, bookings,
 * income, expenses, client projects, deliverables, blog posts, social
 * media accounts, and scheduled social posts.
 *
 * Run:  cd ~/apollo-droneworks && npx tsx server/seed-demo-data.ts
 */
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── date helpers ─────────────────────────────────────────────────────────────
const BASE = new Date("2026-05-23T12:00:00Z");
const d = (n: number) => { const t = new Date(BASE); t.setDate(t.getDate() + n); return t; };
const ts = (date: Date) => date.toISOString();
const dateStr = (date: Date) => date.toISOString().split("T")[0];

// ── image helpers ─────────────────────────────────────────────────────────────
const us = (id: string) =>
  `https://images.unsplash.com/photo-${id}?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80`;
const ps = (seed: string) =>
  `https://picsum.photos/seed/${seed}/800/450`;

// ── main seed ─────────────────────────────────────────────────────────────────
async function seed() {
  const c = await pool.connect();
  console.log("🌱  Starting Apollo DroneWorks demo seed…");

  try {

    // ── CLEAR EXISTING DATA ─────────────────────────────────────────────────
    console.log("  Clearing existing data…");
    const clearOrder = [
      "timelapse_items", "task_files", "project_tasks", "project_milestones",
      "project_deliverables", "project_files", "social_posts",
      "social_media_accounts", "blog_posts", "project_analytics",
    ];
    for (const t of clearOrder) await c.query(`DELETE FROM ${t}`);
    await c.query("UPDATE bookings SET project_id = NULL");
    await c.query("DELETE FROM client_projects");
    await c.query("DELETE FROM income");
    await c.query("DELETE FROM expenses");
    await c.query("DELETE FROM bookings");
    await c.query("DELETE FROM customers");
    console.log("  ✓ Tables cleared");

    // ── CUSTOMERS ───────────────────────────────────────────────────────────
    console.log("  Seeding customers…");
    const custData = [
      { fn:"Sarah",    ln:"Mitchell", email:"sarah@mitchellrealtygroup.com",  phone:"(801) 555-0142", co:"Mitchell Luxury Real Estate",      city:"Salt Lake City", st:"UT", zip:"84101" },
      { fn:"Marcus",   ln:"Torres",   email:"marcus@torresconstruction.com",  phone:"(801) 555-0278", co:"Torres Construction Group",        city:"Provo",          st:"UT", zip:"84601" },
      { fn:"Jennifer", ln:"Walsh",    email:"jennifer@blueridgepm.com",       phone:"(385) 555-0391", co:"Blue Ridge Property Management",   city:"Sandy",          st:"UT", zip:"84070" },
      { fn:"David",    ln:"Chen",     email:"david@pinnacleroof.com",         phone:"(801) 555-0514", co:"Pinnacle Roofing & Inspections",   city:"Ogden",          st:"UT", zip:"84401" },
      { fn:"Robert",   ln:"Hoffman",  email:"rhoffman@summitdev.com",         phone:"(435) 555-0627", co:"Summit Development LLC",           city:"Park City",      st:"UT", zip:"84060" },
      { fn:"Amanda",   ln:"Rivers",   email:"amanda@cascademedia.co",         phone:"(801) 555-0739", co:"Cascade Media Productions",        city:"Salt Lake City", st:"UT", zip:"84102" },
      { fn:"Tyler",    ln:"Owens",    email:"tyler@granitepeak.ag",           phone:"(435) 555-0852", co:"Granite Peak Agriculture",         city:"Logan",          st:"UT", zip:"84321" },
      { fn:"Nancy",    ln:"Park",     email:"nancy@lakeviewcommercial.com",   phone:"(801) 555-0963", co:"Lakeview Commercial Properties",  city:"West Jordan",    st:"UT", zip:"84084" },
    ];
    const custIds: Record<string, number> = {};
    for (const cu of custData) {
      const { rows } = await c.query(
        `INSERT INTO customers (first_name,last_name,name,email,phone,company,city,state,postal_code,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',NOW(),NOW()) RETURNING id`,
        [cu.fn, cu.ln, `${cu.fn} ${cu.ln}`, cu.email, cu.phone, cu.co, cu.city, cu.st, cu.zip]
      );
      custIds[cu.email] = rows[0].id;
    }
    console.log(`  ✓ ${custData.length} customers`);

    const cSarah  = custIds["sarah@mitchellrealtygroup.com"];
    const cMarcus = custIds["marcus@torresconstruction.com"];
    const cJen    = custIds["jennifer@blueridgepm.com"];
    const cDavid  = custIds["david@pinnacleroof.com"];
    const cRobert = custIds["rhoffman@summitdev.com"];
    const cAmanda = custIds["amanda@cascademedia.co"];
    const cTyler  = custIds["tyler@granitepeak.ag"];
    const cNancy  = custIds["nancy@lakeviewcommercial.com"];

    // ── BOOKINGS ────────────────────────────────────────────────────────────
    console.log("  Seeding bookings…");
    type Booking = {
      svcId: number; name: string; email: string; phone: string;
      loc: string; date: Date; status: string; amount: number;
      payStatus: string; pilot: string | null; notes: string;
      completedAt: Date | null;
    };
    const bookingData: Booking[] = [
      // ── Completed
      { svcId:1, name:"Sarah Mitchell",  email:"sarah@mitchellrealtygroup.com",  phone:"(801) 555-0142", loc:"2847 Emigration Canyon Rd, Salt Lake City UT 84108", date:new Date("2026-01-15"), status:"completed", amount:185000, payStatus:"paid", pilot:"Brandon Cole", notes:"Luxury estate — 6,400 sq ft. Golden hour shoot, full video tour requested.", completedAt:new Date("2026-01-17") },
      { svcId:4, name:"David Chen",      email:"david@pinnacleroof.com",         phone:"(801) 555-0514", loc:"3910 Harrison Blvd, Ogden UT 84403",                  date:new Date("2026-02-03"), status:"completed", amount:49500,  payStatus:"paid", pilot:"Brandon Cole", notes:"Post-hail storm assessment — 3 commercial flat roofs. Thermal add-on included.", completedAt:new Date("2026-02-05") },
      { svcId:7, name:"Marcus Torres",   email:"marcus@torresconstruction.com",  phone:"(801) 555-0278", loc:"Mountain View Subdivision Phase 2, Provo UT 84601",   date:new Date("2026-03-12"), status:"completed", amount:350000, payStatus:"paid", pilot:"Brandon Cole", notes:"Monthly construction monitoring — March cycle. Cut & fill volume analysis.", completedAt:new Date("2026-03-14") },
      { svcId:2, name:"Jennifer Walsh",  email:"jennifer@blueridgepm.com",       phone:"(385) 555-0391", loc:"150 E Center St Suite 400, Sandy UT 84070",           date:new Date("2026-03-28"), status:"completed", amount:98000,  payStatus:"paid", pilot:"Brandon Cole", notes:"Virtual walkthrough for newly renovated corporate suites. Twilight shoot.", completedAt:new Date("2026-03-30") },
      { svcId:9, name:"Robert Hoffman",  email:"rhoffman@summitdev.com",         phone:"(435) 555-0627", loc:"Deer Crest Estates, Park City UT 84060",              date:new Date("2026-04-10"), status:"completed", amount:420000, payStatus:"paid", pilot:"Brandon Cole", notes:"3D mesh of 4-acre mountainside parcel. High-density GCP network for ±2 cm accuracy.", completedAt:new Date("2026-04-12") },
      { svcId:3, name:"Amanda Rivers",   email:"amanda@cascademedia.co",         phone:"(801) 555-0739", loc:"Downtown SLC & Millcreek Canyon, UT",                 date:new Date("2026-04-25"), status:"completed", amount:280000, payStatus:"paid", pilot:"Brandon Cole", notes:"Summer lifestyle campaign — 3 locations, magic-hour shoot both mornings.", completedAt:new Date("2026-04-27") },
      // ── Confirmed / upcoming
      { svcId:1, name:"Nancy Park",      email:"nancy@lakeviewcommercial.com",   phone:"(801) 555-0963", loc:"9200 S 700 W, West Jordan UT 84084",                  date:d(14), status:"confirmed", amount:145000, payStatus:"deposit_paid", pilot:"Brandon Cole", notes:"Mixed-use retail complex listing. Client wants twilight + daytime sets.", completedAt:null },
      { svcId:8, name:"Robert Hoffman",  email:"rhoffman@summitdev.com",         phone:"(435) 555-0627", loc:"Silver Springs Parcel C, Park City UT 84060",         date:d(21), status:"confirmed", amount:480000, payStatus:"deposit_paid", pilot:"Brandon Cole", notes:"Aerial mapping — 85-acre development site. Orthomosaic + DSM/DTM required.", completedAt:null },
      { svcId:7, name:"Marcus Torres",   email:"marcus@torresconstruction.com",  phone:"(801) 555-0278", loc:"Mountain View Subdivision Phase 2, Provo UT 84601",   date:d(35), status:"confirmed", amount:350000, payStatus:"deposit_paid", pilot:"Brandon Cole", notes:"Monthly construction monitoring — June cycle.", completedAt:null },
      { svcId:4, name:"Jennifer Walsh",  email:"jennifer@blueridgepm.com",       phone:"(385) 555-0391", loc:"4200 Commerce Dr, Sandy UT 84070",                    date:d(42), status:"confirmed", amount:52500,  payStatus:"unpaid",       pilot:"Brandon Cole", notes:"Annual flat-roof inspection package — 3 commercial buildings.", completedAt:null },
      // ── Pending
      { svcId:10,name:"Tyler Owens",     email:"tyler@granitepeak.ag",           phone:"(435) 555-0852", loc:"Granite Peak Farm, Logan UT 84321",                   date:d(52), status:"pending",   amount:380000, payStatus:"unpaid", pilot:null, notes:"Season-long crop monitoring timelapse — wheat and hay fields, June–Sept.", completedAt:null },
      { svcId:6, name:"David Chen",      email:"david@pinnacleroof.com",         phone:"(801) 555-0514", loc:"I-15 Overpass Bridge, Springville UT 84663",          date:d(60), status:"pending",   amount:290000, payStatus:"unpaid", pilot:null, notes:"Bridge structural inspection. Quote requested by UDOT subcontractor.", completedAt:null },
      { svcId:1, name:"Sarah Mitchell",  email:"sarah@mitchellrealtygroup.com",  phone:"(801) 555-0142", loc:"5 Cottonwood Heights Dr, Salt Lake City UT 84121",    date:d(68), status:"pending",   amount:215000, payStatus:"unpaid", pilot:null, notes:"Estate listing + property tour combo. Seller wants both photo and video packages.", completedAt:null },
      // ── Cancelled
      { svcId:5, name:"Marcus Torres",   email:"marcus@torresconstruction.com",  phone:"(801) 555-0278", loc:"Cascade Junction Development, Provo UT",              date:new Date("2026-03-01"), status:"cancelled", amount:0, payStatus:"refunded", pilot:null, notes:"Project financing fell through. Client will rebook when funding is secured.", completedAt:null },
      { svcId:3, name:"Amanda Rivers",   email:"amanda@cascademedia.co",         phone:"(801) 555-0739", loc:"Red Butte Garden, Salt Lake City UT",                  date:new Date("2026-03-20"), status:"cancelled", amount:0, payStatus:"refunded", pilot:null, notes:"Weather window missed three times. Rescheduled to summer campaign instead.", completedAt:null },
    ];

    const bookingIds: number[] = [];
    for (const bk of bookingData) {
      const { rows } = await c.query(
        `INSERT INTO bookings (user_id,service_id,customer_name,customer_email,customer_phone,project_location,date,status,total_amount,payment_status,pilot_assigned,notes,created_at,updated_at,completed_at)
         VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$6,$6,$12) RETURNING id`,
        [bk.svcId, bk.name, bk.email, bk.phone, bk.loc, ts(bk.date), bk.status,
         bk.amount, bk.payStatus, bk.pilot, bk.notes, bk.completedAt ? ts(bk.completedAt) : null]
      );
      bookingIds.push(rows[0].id);
    }
    const [bk1Id,bk2Id,bk3Id,bk4Id,bk5Id,bk6Id] = bookingIds;
    console.log(`  ✓ ${bookingIds.length} bookings`);

    // ── INCOME ──────────────────────────────────────────────────────────────
    console.log("  Seeding income…");
    const incomeData = [
      { amt:185000, desc:"Aerial listing shoot — 2847 Emigration Canyon Rd",       client:"Mitchell Luxury Real Estate",    date:"2026-01-17", inv:"INV-2026-001", method:"bank_transfer", bkId:bk1Id },
      { amt: 49500, desc:"Roof inspection & thermal report — Ogden commercial",    client:"Pinnacle Roofing & Inspections", date:"2026-02-05", inv:"INV-2026-002", method:"check",         bkId:bk2Id },
      { amt:350000, desc:"Construction monitoring March — Mountain View Ph.2",     client:"Torres Construction Group",      date:"2026-03-14", inv:"INV-2026-003", method:"bank_transfer", bkId:bk3Id },
      { amt: 98000, desc:"Virtual tour — Blue Ridge corporate suites",             client:"Blue Ridge Property Management", date:"2026-03-30", inv:"INV-2026-004", method:"credit_card",   bkId:bk4Id },
      { amt:420000, desc:"3D terrain model — Deer Crest Estates, Park City",       client:"Summit Development LLC",         date:"2026-04-12", inv:"INV-2026-005", method:"bank_transfer", bkId:bk5Id },
      { amt:280000, desc:"Summer brand campaign shoot — Cascade Media",            client:"Cascade Media Productions",      date:"2026-04-27", inv:"INV-2026-006", method:"bank_transfer", bkId:bk6Id },
      { amt: 72500, desc:"Rush add-on — expedited 3-day delivery",                 client:"Mitchell Luxury Real Estate",    date:"2026-02-20", inv:"INV-2026-007", method:"venmo",         bkId:null  },
      { amt: 35000, desc:"Stock footage license — aerial SLC skyline (2 clips)",   client:"Cascade Media Productions",      date:"2026-05-02", inv:"INV-2026-008", method:"paypal",        bkId:null  },
    ];
    for (const inc of incomeData) {
      await c.query(
        `INSERT INTO income (user_id,amount,description,client,date,invoice_id,payment_method,category,status,booking_id,created_at,updated_at)
         VALUES (1,$1,$2,$3,$4,$5,$6,'service','received',$7,NOW(),NOW())`,
        [inc.amt, inc.desc, inc.client, inc.date, inc.inv, inc.method, inc.bkId]
      );
    }
    console.log(`  ✓ ${incomeData.length} income records`);

    // ── PROJECT ANALYTICS ────────────────────────────────────────────────────
    // One record per completed booking — revenue matches the income records above.
    // Costs are estimated direct-project costs (equipment depreciation, travel,
    // processing labor). Overhead (insurance, software subscriptions) lives in
    // the expenses table and is not double-counted here.
    console.log("  Seeding project analytics…");
    type PA = { bkId: number | null; svcType: string; flightH: number; procH: number; rev: number; costs: number; clientType: string; loc: string; compDate: string; score: number; notes: string };
    const paData: PA[] = [
      { bkId:bk1Id, svcType:"Real Estate Photography",   flightH:2.5, procH:3.0,  rev:185000, costs: 48000, clientType:"Real Estate Agent", loc:"Salt Lake City, UT",    compDate:"2026-01-17", score:4.9, notes:"Luxury estate — golden hour. Client requested MLS-ready set + 60-sec reel." },
      { bkId:bk2Id, svcType:"Roof Inspection",           flightH:1.5, procH:2.0,  rev: 49500, costs: 14500, clientType:"Contractor",         loc:"Ogden, UT",             compDate:"2026-02-05", score:4.8, notes:"Post-hail assessment — 3 flat roofs. Thermal add-on. Annotated PDF delivered." },
      { bkId:bk3Id, svcType:"Construction Monitoring",  flightH:4.0, procH:8.0,  rev:350000, costs: 95000, clientType:"Contractor",         loc:"Provo, UT",             compDate:"2026-03-14", score:4.7, notes:"Monthly monitoring — March cycle. Cut/fill volume analysis. GCP-registered." },
      { bkId:bk4Id, svcType:"Virtual Tour",              flightH:2.0, procH:2.5,  rev: 98000, costs: 26500, clientType:"Property Manager",   loc:"Sandy, UT",             compDate:"2026-03-30", score:4.9, notes:"Corporate suite walkthrough. Twilight exterior + interior flow edit." },
      { bkId:bk5Id, svcType:"Photogrammetry / 3D Mapping", flightH:6.0, procH:24.0, rev:420000, costs:115000, clientType:"Developer",      loc:"Park City, UT",          compDate:"2026-04-12", score:5.0, notes:"4-acre 3D mesh. ±2.1 cm vertical accuracy. High-density GCP network." },
      { bkId:bk6Id, svcType:"Aerial Videography",        flightH:8.0, procH:16.0, rev:280000, costs: 78000, clientType:"Media",             loc:"Salt Lake City, UT",    compDate:"2026-04-27", score:4.8, notes:"Summer brand campaign — 3 locations, magic-hour. 4K ProRes masters delivered." },
      { bkId:null,  svcType:"Real Estate Photography",   flightH:0.5, procH:1.0,  rev: 72500, costs: 12000, clientType:"Real Estate Agent", loc:"Salt Lake City, UT",    compDate:"2026-02-20", score:4.7, notes:"Rush add-on — expedited 3-day edit delivery for Emigration Canyon listing." },
      { bkId:null,  svcType:"Aerial Videography",        flightH:0.0, procH:2.0,  rev: 35000, costs:  3500, clientType:"Media",             loc:"Salt Lake City, UT",    compDate:"2026-05-02", score:4.6, notes:"Stock footage license — archival SLC skyline clips (2 clips, royalty-free)." },
    ];
    for (const pa of paData) {
      const totalH = pa.flightH + pa.procH;
      const profit = pa.rev - pa.costs;
      const margin = pa.rev > 0 ? (profit / pa.rev) * 100 : 0;
      await c.query(
        `INSERT INTO project_analytics (booking_id, service_type, flight_hours, processing_hours, total_hours, revenue, costs, profit, profit_margin, client_type, location, completion_date, quality_score, notes, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
        [pa.bkId, pa.svcType, pa.flightH, pa.procH, totalH, pa.rev, pa.costs, profit, parseFloat(margin.toFixed(2)), pa.clientType, pa.loc, pa.compDate, pa.score, pa.notes]
      );
    }
    const paTotalRevenue = paData.reduce((s, r) => s + r.rev, 0);
    console.log(`  ✓ ${paData.length} project analytics records (total revenue $${paTotalRevenue.toLocaleString()})`);

    // ── EXPENSES ────────────────────────────────────────────────────────────
    // cat IDs: 1=Equipment 2=Software 3=Travel 4=Insurance 5=Training 6=Marketing 7=Office
    console.log("  Seeding expenses…");
    type Expense = { cat: number; amt: number; desc: string; vendor: string; date: string; method: string; recurring: boolean };
    const expenseData: Expense[] = [
      // Insurance (monthly Jan–May)
      { cat:4, amt:18500, desc:"Aviation & general liability insurance — Jan", vendor:"State Farm Business", date:"2026-01-01", method:"bank_transfer", recurring:true },
      { cat:4, amt:18500, desc:"Aviation & general liability insurance — Feb", vendor:"State Farm Business", date:"2026-02-01", method:"bank_transfer", recurring:true },
      { cat:4, amt:18500, desc:"Aviation & general liability insurance — Mar", vendor:"State Farm Business", date:"2026-03-01", method:"bank_transfer", recurring:true },
      { cat:4, amt:18500, desc:"Aviation & general liability insurance — Apr", vendor:"State Farm Business", date:"2026-04-01", method:"bank_transfer", recurring:true },
      { cat:4, amt:18500, desc:"Aviation & general liability insurance — May", vendor:"State Farm Business", date:"2026-05-01", method:"bank_transfer", recurring:true },
      // Software (monthly)
      { cat:2, amt:8900, desc:"Pix4D Mapper — Jan",  vendor:"Pix4D",  date:"2026-01-05", method:"credit_card", recurring:true },
      { cat:2, amt:8900, desc:"Pix4D Mapper — Feb",  vendor:"Pix4D",  date:"2026-02-05", method:"credit_card", recurring:true },
      { cat:2, amt:8900, desc:"Pix4D Mapper — Mar",  vendor:"Pix4D",  date:"2026-03-05", method:"credit_card", recurring:true },
      { cat:2, amt:8900, desc:"Pix4D Mapper — Apr",  vendor:"Pix4D",  date:"2026-04-05", method:"credit_card", recurring:true },
      { cat:2, amt:8900, desc:"Pix4D Mapper — May",  vendor:"Pix4D",  date:"2026-05-05", method:"credit_card", recurring:true },
      { cat:2, amt:5500, desc:"Adobe Creative Cloud — Jan (Premiere, Lightroom, PS)", vendor:"Adobe", date:"2026-01-10", method:"credit_card", recurring:true },
      { cat:2, amt:5500, desc:"Adobe Creative Cloud — Feb", vendor:"Adobe", date:"2026-02-10", method:"credit_card", recurring:true },
      { cat:2, amt:5500, desc:"Adobe Creative Cloud — Mar", vendor:"Adobe", date:"2026-03-10", method:"credit_card", recurring:true },
      { cat:2, amt:5500, desc:"Adobe Creative Cloud — Apr", vendor:"Adobe", date:"2026-04-10", method:"credit_card", recurring:true },
      { cat:2, amt:5500, desc:"Adobe Creative Cloud — May", vendor:"Adobe", date:"2026-05-10", method:"credit_card", recurring:true },
      // Equipment
      { cat:1, amt:42000, desc:"DJI Care Refresh — Matrice 4E annual plan",         vendor:"DJI Store",  date:"2026-01-20", method:"credit_card", recurring:false },
      { cat:1, amt: 8750, desc:"ND filter set (ND64, ND256) — Matrice 4E",          vendor:"Polar Pro",  date:"2026-02-14", method:"credit_card", recurring:false },
      { cat:1, amt:15600, desc:"4× LiPo battery packs — Air 3S",                   vendor:"B&H Photo",  date:"2026-03-03", method:"credit_card", recurring:false },
      { cat:1, amt: 6200, desc:"SanDisk Extreme Pro 1TB SSD ×2 — field storage",   vendor:"Amazon",     date:"2026-04-22", method:"credit_card", recurring:false },
      // Travel
      { cat:3, amt:12400, desc:"Vehicle charging & fuel — Jan field ops",           vendor:"Tesla Supercharger", date:"2026-01-31", method:"credit_card", recurring:true },
      { cat:3, amt:12400, desc:"Vehicle charging & fuel — Feb field ops",           vendor:"Tesla Supercharger", date:"2026-02-28", method:"credit_card", recurring:true },
      { cat:3, amt:12400, desc:"Vehicle charging & fuel — Mar field ops",           vendor:"Tesla Supercharger", date:"2026-03-31", method:"credit_card", recurring:true },
      { cat:3, amt:12400, desc:"Vehicle charging & fuel — Apr field ops",           vendor:"Tesla Supercharger", date:"2026-04-30", method:"credit_card", recurring:true },
      { cat:3, amt:14800, desc:"Vehicle maintenance — tire rotation, brake check",  vendor:"Big O Tires SLC",   date:"2026-02-18", method:"credit_card", recurring:false },
      // Marketing
      { cat:6, amt:25000, desc:"Google Ads — Q1 local drone services campaign",    vendor:"Google",    date:"2026-01-15", method:"credit_card", recurring:false },
      { cat:6, amt:18000, desc:"Instagram / Facebook Ads — real estate targeting", vendor:"Meta Ads",  date:"2026-05-01", method:"credit_card", recurring:false },
      // Office / Filing
      { cat:7, amt:7000, desc:"Utah LLC annual report filing fee",                 vendor:"Utah Division of Corps", date:"2026-01-03", method:"bank_transfer", recurring:false },
      { cat:2, amt: 500, desc:"FAA Part 107 airman certificate renewal",           vendor:"FAA DroneZone",          date:"2026-03-15", method:"credit_card",   recurring:false },
      // Training
      { cat:5, amt:45000, desc:"Photogrammetry advanced course — Coursera",       vendor:"Coursera",  date:"2026-02-01", method:"credit_card", recurring:false },
    ];
    for (const ex of expenseData) {
      await c.query(
        `INSERT INTO expenses (user_id,category_id,amount,description,vendor,date,payment_method,is_deductible,is_recurring,status,created_at,updated_at)
         VALUES (1,$1,$2,$3,$4,$5,$6,true,$7,'active',NOW(),NOW())`,
        [ex.cat, ex.amt, ex.desc, ex.vendor, ex.date, ex.method, ex.recurring]
      );
    }
    console.log(`  ✓ ${expenseData.length} expense records`);

    // ── CLIENT PROJECTS ─────────────────────────────────────────────────────
    console.log("  Seeding client projects…");
    type Project = { name: string; desc: string; clientId: number; svcId: number; status: string; drone: string; due: Date; start: Date; addr: string; notes: string };
    const projectData: Project[] = [
      { name:"Summit Ridge Estate Listing", desc:"Full aerial listing package for 6,400 sq ft luxury estate. Includes edited stills, 60-second highlight reel, and MLS-optimized image set.", clientId:cSarah,  svcId:1, status:"active",    drone:"matrice-4e", due:d(10),  start:d(0),  addr:"2847 Emigration Canyon Rd, Salt Lake City UT 84108", notes:"Priority client. Golden hour window 7:30–9:00 AM. HOA requires 48-hr notice." },
      { name:"Mountain View Ph.2 — June Monitoring", desc:"Monthly construction progress monitoring for 240-unit residential subdivision. Orthomosaic + cut-and-fill volume analysis.", clientId:cMarcus, svcId:7, status:"active",    drone:"matrice-4e", due:d(35),  start:d(0),  addr:"Mountain View Subdivision Phase 2, Provo UT 84601", notes:"GCP network established. Coordinate with site super Ryan Garza (435-555-1234) for gate access." },
      { name:"Blue Ridge Q2 Commercial Inspection Package", desc:"Quarterly roof and façade inspection of three commercial buildings. Annotated PDF reports with geo-tagged photo sets.", clientId:cJen,    svcId:4, status:"active",    drone:"air-3s",     due:d(42),  start:d(0),  addr:"4200–4240 Commerce Dr, Sandy UT 84070", notes:"Three buildings. Coordinate with on-site manager for roof access. Report due before June 15." },
      { name:"Deer Crest 3D Terrain Model", desc:"High-density 3D mesh and point cloud of 4-acre mountainside parcel for architectural feasibility study.", clientId:cRobert, svcId:9, status:"completed", drone:"matrice-4e", due:new Date("2026-04-15"), start:new Date("2026-04-01"), addr:"Deer Crest Estates, Park City UT 84060", notes:"Completed. Client approved final deliverables 2026-04-18. All files archived to client portal." },
      { name:"Silver Springs Parcel C — Aerial Mapping", desc:"Full topographic mapping of 85-acre undeveloped parcel. Orthomosaic, DSM, DTM, contour lines for civil engineering use.", clientId:cRobert, svcId:8, status:"active",    drone:"matrice-4e", due:d(21),  start:d(0),  addr:"Silver Springs Parcel C, Park City UT 84060", notes:"GCP survey by Apex Surveying completed 2026-05-20. Weather window: 48 hrs advance notice required." },
      { name:"Summer Brand Campaign 2026 — Cascade Media", desc:"Lifestyle brand campaign: aerial b-roll at 3 Utah locations. 2 shoot days, magic-hour timing.", clientId:cAmanda, svcId:3, status:"active",    drone:"air-3s",     due:d(28),  start:d(0),  addr:"SLC Skyline / Millcreek Canyon / Bonneville Flats, UT", notes:"Creative brief and shot list approved. MOS required at Bonneville. BLM permit pending." },
    ];
    const projectIds: number[] = [];
    for (const pr of projectData) {
      const { rows } = await c.query(
        `INSERT INTO client_projects (name,description,client_id,service_id,status,drone_type,due_date,start_date,address,notes,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW()) RETURNING id`,
        [pr.name, pr.desc, pr.clientId, pr.svcId, pr.status, pr.drone, ts(pr.due), ts(pr.start), pr.addr, pr.notes]
      );
      projectIds.push(rows[0].id);
    }
    const [p1,p2,p3,p4,p5,p6] = projectIds;
    console.log(`  ✓ ${projectIds.length} client projects`);

    // ── PROJECT DELIVERABLES ─────────────────────────────────────────────────
    console.log("  Seeding project deliverables…");
    type Deliv = { projectId: number; name: string; type: string; status: string; due: Date; notes: string | null };
    const delivData: Deliv[] = [
      // Project 1 — Real estate listing
      { projectId:p1, name:"Edited Aerial Photo Set (25 optimized JPGs)",           type:"photo",      status:"processing", due:d(10), notes:"Culling and color grading underway in Lightroom." },
      { projectId:p1, name:"Highlight Video — 60-Second Reel (MP4)",                type:"video",      status:"pending",    due:d(10), notes:"Awaiting photo sign-off before edit begins." },
      { projectId:p1, name:"MLS-Ready Image Set (web-optimized JPGs)",              type:"photo",      status:"pending",    due:d(10), notes:"Export after main set approved by client." },
      // Project 2 — Construction monitoring
      { projectId:p2, name:"Georeferenced Orthomosaic — June (GeoTIFF)",            type:"geotiff",    status:"pending",    due:d(35), notes:"Flight scheduled June 2. ~6 hr processing time." },
      { projectId:p2, name:"Digital Surface Model — DSM (GeoTIFF)",                 type:"geotiff",    status:"pending",    due:d(35), notes:"Generated from same dataset as orthomosaic." },
      { projectId:p2, name:"Volume Calculations Report (PDF)",                      type:"pdf",        status:"pending",    due:d(35), notes:"Compare May baseline. Client needs for contractor billing." },
      // Project 3 — Commercial inspection
      { projectId:p3, name:"Inspection Report — 4200 Commerce Dr (PDF)",            type:"pdf",        status:"ready",      due:d(42), notes:"Report signed off. Ready for client download." },
      { projectId:p3, name:"Inspection Report — 4220 Commerce Dr (PDF)",            type:"pdf",        status:"processing", due:d(42), notes:"Annotations in progress." },
      { projectId:p3, name:"Inspection Report — 4240 Commerce Dr (PDF)",            type:"pdf",        status:"pending",    due:d(42), notes:"Scheduled for June 4 flight." },
      { projectId:p3, name:"Full Resolution Photo Set — All 3 Buildings (JPG)",     type:"photo",      status:"delivered",  due:d(42), notes:"Delivered 2026-05-15 via shareable link." },
      // Project 4 — 3D Model (completed)
      { projectId:p4, name:"Textured 3D Mesh (OBJ + GLB formats)",                 type:"model",      status:"delivered",  due:new Date("2026-04-15"), notes:"Approved by client 2026-04-18." },
      { projectId:p4, name:"Point Cloud — Full Density (LAS/LAZ)",                 type:"pointcloud", status:"delivered",  due:new Date("2026-04-15"), notes:"Delivered with 3D mesh." },
      { projectId:p4, name:"Measurements & Elevations Report (PDF)",               type:"pdf",        status:"delivered",  due:new Date("2026-04-15"), notes:"±2.1 cm vertical accuracy confirmed. Usable for architectural plans." },
      // Project 5 — Aerial mapping
      { projectId:p5, name:"Georeferenced Orthomosaic — Silver Springs (GeoTIFF)", type:"geotiff",    status:"pending",    due:d(21), notes:"Flight pending weather window." },
      { projectId:p5, name:"Digital Surface Model — DSM (GeoTIFF)",                type:"geotiff",    status:"pending",    due:d(21), notes:null },
      { projectId:p5, name:"Digital Terrain Model — DTM (GeoTIFF)",                type:"geotiff",    status:"pending",    due:d(21), notes:null },
      { projectId:p5, name:"Contour Lines — 1 ft interval (SHP/DXF)",              type:"other",      status:"pending",    due:d(21), notes:"Required by civil engineer of record." },
      { projectId:p5, name:"KMZ for Google Earth Visualization",                   type:"kmz",        status:"pending",    due:d(21), notes:null },
      // Project 6 — Brand campaign
      { projectId:p6, name:"SLC Skyline Aerial B-Roll (4K MP4)",                   type:"video",      status:"processing", due:d(28), notes:"Shot 2026-05-21. Color grade in DaVinci Resolve underway." },
      { projectId:p6, name:"Millcreek Canyon Nature B-Roll (4K MP4)",              type:"video",      status:"pending",    due:d(28), notes:"Shoot day 2 — 2026-05-28, weather permitting." },
      { projectId:p6, name:"Bonneville Flats Speed Reel (4K MP4)",                 type:"video",      status:"pending",    due:d(28), notes:"BLM location permit pending." },
      { projectId:p6, name:"Social Media Cuts — 9:16 vertical (×6 clips)",         type:"video",      status:"pending",    due:d(28), notes:"Will cut after all B-roll approved." },
    ];
    for (const dv of delivData) {
      await c.query(
        `INSERT INTO project_deliverables (project_id,name,type,status,due_date,notes,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [dv.projectId, dv.name, dv.type, dv.status, ts(dv.due), dv.notes]
      );
    }
    console.log(`  ✓ ${delivData.length} project deliverables`);

    // ── BLOG POSTS ───────────────────────────────────────────────────────────
    console.log("  Seeding blog posts…");
    type BlogPost = { title: string; content: string; excerpt: string; category: string; imageUrl: string; keywords: string[]; date: Date };
    const blogData: BlogPost[] = [
      {
        title: "5 Reasons Aerial Photography Sells Utah Properties 34% Faster",
        excerpt: "Listings with drone imagery sell 34% faster and attract 68% more views. Here's why Utah sellers can't afford to skip aerial photography.",
        category: "real-estate",
        imageUrl: us("1562408590-e32931084e23"),
        keywords: ["aerial photography","real estate","drone","property","Utah","listing"],
        date: new Date("2026-01-08"),
        content: `Aerial photography isn't just a nice-to-have for Utah real estate listings anymore — it's a competitive necessity. Studies from the National Association of Realtors show that listings featuring drone imagery receive 68% more online views and sell 34% faster than ground-only listings.

Here in Utah, where the topography is as dramatic as the market itself, aerial photography does something ground-level cameras simply cannot: it tells the whole story of a property and its relationship to the land.

**1. Context That Converts**
Buyers want to understand proximity — to mountain trails, to the freeway, to the neighborhood. A drone photo from 200 feet reveals all of it instantly. In the Cottonwood Heights, Emigration Canyon, or Park City markets, that context is often the deciding factor.

**2. Lifestyle Sells, Not Just Square Footage**
A 60-second highlight reel shot at golden hour — gliding over a backyard pool toward a mountain backdrop — sells a lifestyle, not just a listing. Emotional connection drives decisions. Video makes that connection visceral.

**3. MLS Compliance Without Sacrifice**
MLS-ready aerial images are color-corrected, resized, and compressed to hit the sweet spot: fast page loads without visible quality loss. We deliver both the full-resolution archive and the MLS-optimized set as standard.

**4. Competitive Differentiation**
Most Utah listings still rely solely on ground photography. Aerial imagery immediately sets a listing apart in a crowded portal. First impressions are made in milliseconds — make yours count.

**5. ROI Is Measurable**
Our clients report an average of $12,000 more in final sale price on listings where aerial imagery was used versus comparable properties without it. The shoot pays for itself — and then some.`,
      },
      {
        title: "How a $495 Drone Roof Inspection Saved One Ogden Homeowner $28,000",
        excerpt: "A homeowner assumed minor hail damage. Our drone inspection found $28,000 in hidden water infiltration the adjuster missed from the ground.",
        category: "drone-tips",
        imageUrl: ps("drone-roof-inspection"),
        keywords: ["roof inspection","drone","insurance","hail damage","Utah","thermal"],
        date: new Date("2026-01-22"),
        content: `After last spring's hail storms swept through Weber County, Ogden homeowner Dale Ferris noticed a few cracked shingles from his backyard. He assumed minor damage — maybe a few hundred dollars in repairs. His insurance adjuster agreed after a 20-minute ground-level walk-around: $1,200 estimated.

Then he hired us.

Our DJI Matrice 4E flew a systematic grid pattern across his 2,400 sq ft roof in 14 minutes, capturing 4K imagery at 2 cm/pixel resolution. Combined with our thermal add-on, we identified not just the visible hail strikes, but 340 sq ft of underlayment water infiltration invisible from the ground — and three compromised ridge vents.

**The Result**
Armed with our annotated PDF report and geo-tagged photo set, Dale filed a supplemental insurance claim. The adjusted payout: $29,200. Total cost of our inspection: $495.

**Why Drone Inspections Find More**
Drone cameras eliminate the parallax limitations of ground-level viewing. We photograph every square foot at consistent, close range. Our thermal add-on detects moisture below the surface — before it becomes a mold or structural problem.

**Safe for Your Roof and Your Inspector**
Traditional inspections put humans on steep, potentially compromised rooftops. Drone inspections eliminate fall risk entirely — a consideration that matters even more after storm damage weakens structural integrity.

Schedule your inspection before your claim window closes. Most Utah insurers require inspections within 90 days of a weather event.`,
      },
      {
        title: "FAA Part 107 in Utah: What Every Property Owner and Contractor Needs to Know",
        excerpt: "Hiring a drone operator in Utah? Understand Part 107, LAANC authorization, and why certificate verification protects you from liability.",
        category: "industry-news",
        imageUrl: us("1473968512647-3e447244af8f"),
        keywords: ["FAA Part 107","regulations","LAANC","airspace","Utah drone laws","liability"],
        date: new Date("2026-02-05"),
        content: `If you're hiring a drone operator in Utah — or considering becoming one — understanding FAA Part 107 isn't optional. It's the legal framework that separates professional, insured drone work from the kind that creates liability for everyone involved.

**What Part 107 Requires**
Commercial drone operators must hold a current FAA Part 107 Remote Pilot Certificate. This involves passing a written aeronautical knowledge test, undergoing TSA vetting, and completing a biennial recurrency course. No certificate = illegal commercial operation.

**Why It Matters for Property Owners**
If an uncertified operator damages your property, injures a bystander, or causes an incident, your liability exposure is significant. Insurance policies typically exclude coverage for operations conducted by non-certified pilots. Always ask for a certificate before any commercial drone work on your site.

**LAANC Authorization in Utah**
Much of the Wasatch Front falls under controlled airspace for Salt Lake City International Airport (KSLC). Legitimate operators use FAA's LAANC system to obtain real-time airspace authorization before every flight. We carry LAANC authorization records for every job.

**What We Carry**
Apollo DroneWorks maintains an active FAA Part 107 certificate, $1M general liability and aviation hull insurance, LAANC authorization for every controlled-airspace flight, and crew equipment and airworthiness records. We provide documentation on request — standard practice for any commercial engagement.`,
      },
      {
        title: "Photogrammetry 101: How We Turn Drone Footage Into Accurate 3D Maps",
        excerpt: "From overlapping aerial photos to centimeter-accurate 3D maps — a plain-English guide to how photogrammetry works and what it delivers.",
        category: "photogrammetry",
        imageUrl: us("1506947411487-a56738267384"),
        keywords: ["photogrammetry","3D modeling","GeoTIFF","mapping","Pix4D","point cloud","survey"],
        date: new Date("2026-02-19"),
        content: `You've seen the end results — a topographic map, a 3D model of a building, a volumetric stockpile report. But how does drone footage actually become a centimeter-accurate digital twin? The answer is photogrammetry.

**The Core Principle**
Photogrammetry identifies the same physical point in multiple overlapping photos taken from different positions. When software knows the camera position and orientation for each image, it triangulates the 3D position of millions of common points. The result is a dense point cloud.

**From Point Cloud to Deliverable**
Once we have the point cloud, we generate:
- **Orthomosaics**: Geometrically corrected aerial maps accurate enough for GIS overlays
- **DSMs / DTMs**: Elevation models used in civil engineering and hydrology
- **Volumetric reports**: Cut-and-fill calculations accurate to within 1–3%
- **3D meshes**: Photo-realistic models for architectural visualization or BIM

**Ground Control Points: The Accuracy Variable**
GCPs — precisely surveyed markers placed before flight — pull accuracy from ±30 cm to ±2–3 cm. For engineering-grade deliverables, GCPs are non-negotiable.

**Our Processing Stack**
We use Pix4D Mapper with QA checkpoints after each stage. Processing a 100-acre site typically takes 4–8 hours of compute time. We deliver all native formats alongside web-viewable outputs.`,
      },
      {
        title: "DJI Matrice 4E vs. Air 3S: Which Drone We Use for Which Job (And Why)",
        excerpt: "We operate both the DJI Matrice 4E and Air 3S — here's exactly when we deploy each platform and why the choice matters for your project.",
        category: "technology",
        imageUrl: us("1579463148228-138296ac3b98"),
        keywords: ["DJI Matrice 4E","Air 3S","drone review","real estate","equipment","sensor","comparison"],
        date: new Date("2026-03-05"),
        content: `Apollo DroneWorks operates two primary platforms: the DJI Matrice 4E and the DJI Air 3S. They're not interchangeable — each has a specific role in our workflow, and matching the right drone to the job is as important as the shot itself.

**DJI Matrice 4E — Our Heavy-Hitter**
The M4E is our workhorse for precision work: photogrammetry, thermal inspection, and any job where sensor quality is non-negotiable. It carries a triple-camera system — wide RGB, zoom, and radiometric thermal — on a platform built for wind stability in Utah's canyon country.

We reach for the M4E when:
- Thermal imaging is required (roof inspections, structural assessment)
- Photogrammetry demands maximum overlap and sensor accuracy
- Wind forecasts exceed 20 mph
- Construction monitoring requires repeatable, GCP-registered coverage

**DJI Air 3S — Speed and Versatility**
The Air 3S is our creative and lightweight platform. Its 1-inch CMOS sensor delivers stunning imagery and video — competitive with the M4E for visual work — at a fraction of the size and cost.

We reach for the Air 3S when:
- Real estate stills and 60-second video tours are the primary deliverable
- Fast mobilization matters (commercial shoots, media work)
- Budget-tier projects need professional results without premium pricing

**The Simple Rule**
Precision and inspection: M4E. Visual storytelling and speed: Air 3S. When in doubt, we bring both.`,
      },
      {
        title: "Before & After: How Monthly Drone Monitoring Saved a Provo Builder $180,000",
        excerpt: "A $350/month monitoring contract caught a $180,000 grading error on a Provo subdivision. The numbers behind proactive aerial oversight.",
        category: "photogrammetry",
        imageUrl: ps("construction-site-aerial-before-after"),
        keywords: ["construction monitoring","orthomosaic","before after","Utah","volume analysis","grading"],
        date: new Date("2026-04-02"),
        content: `When Torres Construction Group broke ground on Mountain View Subdivision Phase 2, site manager Ryan Garza was skeptical about monthly aerial monitoring. "We have a surveyor on site anyway," he told us. "Why do we need drone photos?"

Six months later, Ryan was making the recommendation to his CEO.

**The Catch — Month 3**
In February's monitoring flight, our orthomosaic overlay against the approved grading plan revealed a 14-inch discrepancy in fill elevation across a 0.6-acre pad area. The volume calculation showed 1,400 cubic yards of material placed above spec — material that would have required expensive removal before concrete could pour.

Total catch value: $180,000 in avoided re-work, per the contractor's own estimate.

**The Value of Consistent Baselines**
Monthly monitoring creates an objective, timestamped record of site progress. Disputes with subcontractors, insurance claims, and owner progress updates all become dramatically simpler when you have geo-referenced, photogrammetric truth on your side.

**What We Deliver Each Month**
- Georeferenced orthomosaic (GeoTIFF)
- Cut/fill volume comparison against previous month
- DSM with color-coded elevation deviations
- PDF progress report with annotated anomaly callouts`,
      },
      {
        title: "Why We Film Property Tours at 400 Feet — and Why It Works",
        excerpt: "The altitude, sequence, and timing that makes Utah property tour videos actually sell homes — explained frame by frame.",
        category: "real-estate",
        imageUrl: ps("property-tour-aerial-utah"),
        keywords: ["property tour","video","virtual walkthrough","drone video","real estate","Utah","cinematography"],
        date: new Date("2026-04-16"),
        content: `There's a debate in real estate videography about altitude. Some operators keep their drones low — 50, 80 feet — for tight dramatic shots. Others pull back to reveal the full landscape. We've tested both, and for Utah property tours, we've found a formula that converts.

**The 400-Foot Open**
We open every property tour with a single establishing shot from 400 feet AGL (the FAA ceiling). This shot establishes the property's relationship to its surroundings: the Wasatch peaks, the valley below, the neighborhood. Utah buyers understand geography viscerally — they hike and ski it. Showing a home in that context in the first 5 seconds creates an immediate emotional anchor.

**The Reveal Sequence**
From the high open, we descend in a single continuous move — passing over the roof, sweeping around to the front elevation, arriving at ground level at the front door. This 18-second sequence is our proprietary reveal move, shot at golden hour when possible.

**Interior-Exterior Integration**
We coordinate drone work with interior walkthroughs to deliver a seamlessly edited tour: aerial → façade → entry → interior flow → backyard reveal → aerial close. Total edit time: 2:45–3:30. All delivered in 4K ProRes for maximum platform flexibility.

**Platform Distribution**
Every tour is optimized for three outputs: MLS embed (1080p), social media (vertical 9:16 for Reels/TikTok), and full-quality archive (4K ProRes master).`,
      },
      {
        title: "Flying Smart in Utah's Wind: Our Pre-Flight Checklist for Mountain Terrain",
        excerpt: "Utah canyon winds, afternoon turbulence, and mountain terrain create real risks. Here's the 10-point system we use before every commercial flight.",
        category: "drone-tips",
        imageUrl: ps("utah-mountains-drone-flight"),
        keywords: ["safety","weather","wind","flight planning","Utah","checklist","mountain terrain","Part 107"],
        date: new Date("2026-05-07"),
        content: `Utah's terrain is spectacular — and unforgiving. Canyon gaps accelerate winds to twice the ridgeline speed. Afternoon convective turbulence builds fast in summer. Rotor wash off sharp ridge lines can flip a drone without warning. Flying commercially here requires a systematic pre-flight process, every single time.

**Our 10-Point Pre-Flight Checklist**

1. **Weather brief** — TAFs and METARs for the nearest station plus SIGMET/AIRMET activity. Mountain wave alerts are mandatory reads in the Wasatch.

2. **Wind gradient check** — Surface wind and wind at altitude can differ by 20+ mph in terrain. We check winds aloft at 3,000, 6,000, and 9,000 ft MSL.

3. **LAANC authorization** — Confirmed current and on file before props spin.

4. **Battery temperature** — LiPo batteries under 15°C have 15–20% reduced capacity. In cooler months, we preheat batteries to operating temp before launch.

5. **Compass calibration** — Required at any new location with magnetic interference potential.

6. **RTH altitude setting** — Set to clear the highest obstacle within 500 ft of the launch point, plus 30 ft buffer.

7. **Signal environment scan** — Check for GPS interference, strong RF sources.

8. **Emergency LZ designation** — Two emergency landing zones identified before every flight.

9. **Public notification** — Visible signage at the perimeter for urban operations.

10. **Flight log entry** — Every flight logged: date, location, duration, battery cycles, weather, anomalies.

This isn't bureaucracy — it's the habit that keeps equipment in the air and operators out of the NTSB database.`,
      },
    ];

    const blogIds: number[] = [];
    for (const post of blogData) {
      const { rows } = await c.query(
        `INSERT INTO blog_posts (title,content,excerpt,category,image_url,keywords,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id`,
        [post.title, post.content, post.excerpt, post.category, post.imageUrl, JSON.stringify(post.keywords), ts(post.date)]
      );
      blogIds.push(rows[0].id);
    }
    console.log(`  ✓ ${blogIds.length} blog posts`);

    // The last blog post (mountain safety checklist) is live on the blog.
    // Social media promotion is SCHEDULED — not yet published.
    const scheduledBlogId = blogIds[blogIds.length - 1];

    // ── SOCIAL MEDIA ACCOUNTS ────────────────────────────────────────────────
    console.log("  Seeding social media accounts…");
    const { rows: accts } = await c.query<{ id: number; platform: string }>(`
      INSERT INTO social_media_accounts (user_id, platform, account_id, account_name, access_token, connected, created_at, updated_at)
      VALUES
        (1, 'instagram', 'ig_apollodroneworks_12847', '@apollodroneworks', 'ig_token_placeholder_abc123', true, NOW(), NOW()),
        (1, 'facebook',  'fb_apollodroneworks_98302', 'Apollo DroneWorks', 'fb_token_placeholder_def456', true, NOW(), NOW()),
        (1, 'twitter',   'tw_apollodrones_55821',     '@apollodrones',     'tw_token_placeholder_ghi789', true, NOW(), NOW())
      RETURNING id, platform
    `);
    console.log(`  ✓ ${accts.length} social accounts (Instagram, Facebook, Twitter)`);

    // ── SOCIAL POSTS ──────────────────────────────────────────────────────────
    // 3 already-published + 3 scheduled for next Saturday 9 AM MDT (2026-05-30 15:00 UTC)
    console.log("  Seeding social posts…");
    const nextSaturdayMDT = new Date("2026-05-30T15:00:00.000Z"); // 9 AM MDT

    type SocialPost = { platform: string; content: string; mediaUrl: string | null; keywords: string[]; scheduledFor: Date | null; published: boolean; publishedTo: string[]; blogPostId: number | null; createdAt: Date };
    const socialPosts: SocialPost[] = [
      // ── Published posts
      {
        platform: "instagram",
        content: "✈️ Golden hour over Emigration Canyon — just wrapped up an aerial listing shoot for one of SLC's most stunning estates. The Wasatch framing itself at dusk never gets old. 📍 Salt Lake City, UT\n\n#dronelife #utahdrone #realestatephotography #aerialphoto #saltlakecity #wasatch",
        mediaUrl: ps("real-estate-slc-golden-hour"),
        keywords: ["real estate","aerial","utah","golden hour","drone"],
        scheduledFor: null,
        published: true,
        publishedTo: ["instagram"],
        blogPostId: null,
        createdAt: new Date("2026-01-19"),
      },
      {
        platform: "facebook",
        content: "Just completed a full commercial inspection package for Blue Ridge Property Management — three buildings, one flight day, zero ladders. Our annotated roof reports are already helping their team prioritize Q2 maintenance budgets.\n\nInterested in a commercial inspection package for your managed properties? Visit apollodroneworks.com/services or DM us.",
        mediaUrl: ps("commercial-roof-inspection-ogden"),
        keywords: ["inspection","commercial","property management","drone","Utah"],
        scheduledFor: null,
        published: true,
        publishedTo: ["facebook"],
        blogPostId: null,
        createdAt: new Date("2026-02-12"),
      },
      {
        platform: "twitter",
        content: "We just delivered a 3D mesh of a 4-acre Park City parcel accurate to ±2.1 cm — built from 847 drone images processed with Pix4D. Civil engineering just got a lot less expensive.\n\n#drone #photogrammetry #3Dmodeling #Utah #construction",
        mediaUrl: ps("3d-terrain-park-city-utah"),
        keywords: ["photogrammetry","3D","Park City","drone","engineering"],
        scheduledFor: null,
        published: true,
        publishedTo: ["twitter"],
        blogPostId: null,
        createdAt: new Date("2026-04-22"),
      },
      // ── SCHEDULED (not yet published) — promoting the mountain safety blog post
      // Blog post is live on the site; social amplification fires next Saturday 9 AM MDT
      {
        platform: "instagram",
        content: "🌄 New on the blog: flying smart in Utah's mountain terrain.\n\nCanyon winds, afternoon thermals, rotor wash off ridge lines — our 10-point pre-flight checklist for commercial ops in the Wasatch. Link in bio 👆\n\n#dronelife #utahdrone #dronephotography #Part107 #flyingsafe #wasatch #utah",
        mediaUrl: null,
        keywords: ["safety","checklist","utah","mountain","drone"],
        scheduledFor: nextSaturdayMDT,
        published: false,
        publishedTo: [],
        blogPostId: scheduledBlogId,
        createdAt: d(0),
      },
      {
        platform: "facebook",
        content: `New blog post: "Flying Smart in Utah's Wind — Our Pre-Flight Checklist for Mountain Terrain"\n\nUtah's terrain is spectacular and unforgiving. We break down the 10-point system we use before every commercial flight — wind gradient checks, battery temp, LAANC auth, emergency LZ designation, and more.\n\nRead it at apollodroneworks.com/blog — useful whether you're hiring a drone operator or flying yourself.`,
        mediaUrl: null,
        keywords: ["safety","flying","utah","mountains","checklist","drone"],
        scheduledFor: nextSaturdayMDT,
        published: false,
        publishedTo: [],
        blogPostId: scheduledBlogId,
        createdAt: d(0),
      },
      {
        platform: "twitter",
        content: "New post: 10-point pre-flight checklist for commercial drone ops in Utah mountain terrain.\n\nBattery temp, wind gradient, LAANC auth, RTH altitude, emergency LZ — the habits that keep equipment in the air and operators out of the NTSB database.\n\n→ apollodroneworks.com/blog\n\n#dronepilot #Part107 #UAV #Utah",
        mediaUrl: null,
        keywords: ["safety","uav","utah","drone","Part107"],
        scheduledFor: nextSaturdayMDT,
        published: false,
        publishedTo: [],
        blogPostId: scheduledBlogId,
        createdAt: d(0),
      },
    ];

    for (const sp of socialPosts) {
      await c.query(
        `INSERT INTO social_posts (user_id, platform, content, media_url, media_type, keywords, scheduled_for, published, published_to, blog_post_id, created_at, updated_at)
         VALUES (1, $1, $2, $3, 'image', $4, $5, $6, $7::jsonb, $8, $9, $9)`,
        [
          sp.platform,
          sp.content,
          sp.mediaUrl,
          JSON.stringify(sp.keywords),
          sp.scheduledFor ? ts(sp.scheduledFor) : null,
          sp.published,
          JSON.stringify(sp.publishedTo),
          sp.blogPostId,
          ts(sp.createdAt),
        ]
      );
    }
    const publishedCount = socialPosts.filter(s => s.published).length;
    const scheduledCount = socialPosts.filter(s => !s.published).length;
    console.log(`  ✓ ${socialPosts.length} social posts (${publishedCount} published, ${scheduledCount} scheduled for 2026-05-30 09:00 MDT)`);

    // ── MARKETING ANALYTICS ───────────────────────────────────────────────────
    console.log("  Seeding marketing analytics…");
    type MktRow = { source: string; medium: string; campaign: string | null; keyword: string | null; page: string; visitors: number; uniq: number; pvs: number; bounce: number; dur: number; leads: number; sales: number; rate: number; rev: number; cost: number; date: string };
    const mktData: MktRow[] = [
      { source:"google",    medium:"cpc",     campaign:"drone-real-estate-utah-q1", keyword:"utah drone photography real estate", page:"/services/real-estate-listings", visitors:420, uniq:386, pvs:1104, bounce:0.38, dur:195, leads:18, sales:8, rate:0.021, rev:148000, cost:3200, date:"2026-01-15" },
      { source:"google",    medium:"cpc",     campaign:"drone-real-estate-utah-q1", keyword:"aerial listing photos utah",         page:"/services/real-estate-listings", visitors:310, uniq:294, pvs:843,  bounce:0.42, dur:167, leads:12, sales:5, rate:0.017, rev:92500,  cost:2400, date:"2026-02-15" },
      { source:"google",    medium:"organic", campaign:null,                         keyword:"drone roof inspection utah",         page:"/services/inspections",          visitors:218, uniq:205, pvs:592,  bounce:0.45, dur:143, leads:9,  sales:4, rate:0.018, rev:49500,  cost:0,    date:"2026-02-20" },
      { source:"instagram", medium:"social",  campaign:"listing-reel-jan",           keyword:null,                                page:"/",                              visitors:680, uniq:612, pvs:980,  bounce:0.61, dur:72,  leads:7,  sales:3, rate:0.005, rev:28500,  cost:850,  date:"2026-01-22" },
      { source:"facebook",  medium:"social",  campaign:"commercial-inspection-feb",  keyword:null,                                page:"/services/inspections",          visitors:390, uniq:354, pvs:670,  bounce:0.55, dur:84,  leads:5,  sales:2, rate:0.006, rev:0,      cost:620,  date:"2026-02-14" },
      { source:"google",    medium:"cpc",     campaign:"photogrammetry-mapping-q2",  keyword:"drone mapping utah construction",   page:"/services/construction",         visitors:285, uniq:268, pvs:710,  bounce:0.39, dur:218, leads:14, sales:6, rate:0.022, rev:420000, cost:4100, date:"2026-04-10" },
      { source:"referral",  medium:"direct",  campaign:null,                         keyword:null,                                page:"/",                              visitors:142, uniq:138, pvs:380,  bounce:0.29, dur:312, leads:12, sales:7, rate:0.049, rev:468500, cost:0,    date:"2026-03-01" },
      { source:"google",    medium:"organic", campaign:null,                         keyword:"apollo droneworks utah",            page:"/",                              visitors:198, uniq:188, pvs:510,  bounce:0.31, dur:280, leads:15, sales:9, rate:0.048, rev:350000, cost:0,    date:"2026-05-01" },
    ];
    for (const m of mktData) {
      await c.query(
        `INSERT INTO marketing_analytics (source, medium, campaign, keyword, landing_page, visitors, unique_visitors, page_views, bounce_rate, time_on_site, leads, sales, conversion_rate, revenue, cost, date, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
        [m.source, m.medium, m.campaign, m.keyword, m.page, m.visitors, m.uniq, m.pvs, m.bounce, m.dur, m.leads, m.sales, m.rate, m.rev, m.cost, m.date]
      );
    }
    console.log(`  ✓ ${mktData.length} marketing analytics records`);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    console.log(`
🎉  Seed complete!
    Customers:             ${custData.length}
    Bookings:              ${bookingData.length}  (6 completed, 4 confirmed, 3 pending, 2 cancelled)
    Income records:        ${incomeData.length}   (total $${incomeData.reduce((s,r)=>s+r.amt,0).toLocaleString()})
    Project analytics:     ${paData.length}   (matches income — $${paTotalRevenue.toLocaleString()} revenue)
    Expense records:       ${expenseData.length}
    Client projects:       ${projectData.length}
    Project deliverables:  ${delivData.length}
    Blog posts:            ${blogData.length}
    Social accounts:       ${accts.length}  (Instagram, Facebook, Twitter)
    Social posts:          ${socialPosts.length}  (${publishedCount} published + ${scheduledCount} scheduled 2026-05-30 09:00 MDT)
    Marketing analytics:   ${mktData.length}

📋  Scheduled social post details:
    • Blog post "${blogData[blogData.length-1].title}" is live on the blog.
    • 3 social posts (IG, FB, Twitter) are scheduled for Sat 2026-05-30 09:00 AM MDT.
    • Find them in the Social Media Portal → filter by "scheduled / not published".
`);

  } finally {
    c.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
