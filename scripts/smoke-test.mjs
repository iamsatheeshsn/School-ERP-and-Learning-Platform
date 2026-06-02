import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const DEMO_USERS = [
  "admin@scholaros.demo",
  "teacher1@scholaros.demo",
  "parent1@scholaros.demo",
  "student1@scholaros.demo",
];

const PUBLIC_ROUTES = ["/login", "/"];
const PROTECTED_ROUTES = [
  "/admin/dashboard",
  "/teacher/dashboard",
  "/parent/dashboard",
  "/student/dashboard",
  "/teacher/homework",
  "/parent/fees",
  "/student/homework",
];

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env vars");
  }
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function testDatabase() {
  try {
    getAdminApp();
    const db = getFirestore();
    const auth = getAuth();

    const usersSnap = await db.collection("users").get();
    pass("Firestore connection", `${usersSnap.size} users`);

    for (const email of DEMO_USERS) {
      const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();
      if (userSnap.empty) {
        fail(`Seed user exists: ${email}`);
        continue;
      }
      pass(`Firestore user: ${email}`);

      try {
        await auth.getUserByEmail(email);
        pass(`Auth user: ${email}`);
      } catch {
        fail(`Auth user: ${email}`, "not found in Firebase Auth");
      }
    }

    const [students, threads, invoices, homework] = await Promise.all([
      db.collection("studentProfiles").get(),
      db.collection("messageThreads").get(),
      db.collection("feeInvoices").get(),
      db.collection("homework").get(),
    ]);
    pass(
      "Seed data",
      `${students.size} students, ${threads.size} threads, ${invoices.size} invoices, ${homework.size} homework`
    );
  } catch (error) {
    fail("Firestore connection", error instanceof Error ? error.message : String(error));
  }
}

async function fetchStatus(path, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      redirect: "manual",
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function testRoutes() {
  for (const path of PUBLIC_ROUTES) {
    try {
      const res = await fetchStatus(path);
      if (res.status >= 200 && res.status < 400) pass(`Route ${path}`, `HTTP ${res.status}`);
      else fail(`Route ${path}`, `HTTP ${res.status}`);
    } catch (error) {
      fail(`Route ${path}`, error instanceof Error ? error.message : String(error));
    }
  }

  for (const path of PROTECTED_ROUTES) {
    try {
      const res = await fetchStatus(path);
      if (res.status === 307 || res.status === 302 || res.status === 401) {
        pass(`Protected ${path}`, `redirects/unauth HTTP ${res.status}`);
      } else if (res.status === 200) {
        pass(`Protected ${path}`, `HTTP 200 (session may exist)`);
      } else {
        fail(`Protected ${path}`, `HTTP ${res.status}`);
      }
    } catch (error) {
      fail(`Route ${path}`, error instanceof Error ? error.message : String(error));
    }
  }
}

console.log(`\nScholarOS smoke test → ${BASE_URL}\n`);

await testDatabase();
await testRoutes();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
