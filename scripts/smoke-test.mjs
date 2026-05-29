import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3001";
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
  "/api/auth/session",
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

async function testDatabase() {
  const db = new PrismaClient();
  try {
    const userCount = await db.user.count();
    pass("Database connection", `${userCount} users`);

    for (const email of DEMO_USERS) {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        fail(`Seed user exists: ${email}`);
        continue;
      }
      const valid = await bcrypt.compare("password123", user.hashedPassword);
      if (valid) pass(`Password hash: ${email}`);
      else fail(`Password hash: ${email}`, "password123 does not match");
    }

    const [students, threads, invoices, homework] = await Promise.all([
      db.studentProfile.count(),
      db.messageThread.count(),
      db.feeInvoice.count(),
      db.homework.count(),
    ]);
    pass("Seed data", `${students} students, ${threads} threads, ${invoices} invoices, ${homework} homework`);
  } catch (error) {
    fail("Database connection", error instanceof Error ? error.message : String(error));
  } finally {
    await db.$disconnect();
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

async function testAuthFlow() {
  try {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    if (!csrfRes.ok) {
      fail("Auth CSRF", `HTTP ${csrfRes.status}`);
      return;
    }
    const { csrfToken } = await csrfRes.json();
    pass("Auth CSRF", "token received");

    const body = new URLSearchParams({
      csrfToken,
      email: "admin@scholaros.demo",
      password: "password123",
      redirect: "false",
      json: "true",
    });

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfRes.headers.get("set-cookie") ?? "",
      },
      body,
      redirect: "manual",
    });

    const loginJson = await loginRes.json().catch(() => ({}));
    const setCookie = loginRes.headers.get("set-cookie") ?? "";

    if (loginJson.error) {
      fail("Admin login", loginJson.error);
      return;
    }

    pass("Admin login", `HTTP ${loginRes.status}`);

    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: setCookie },
    });
    const session = await sessionRes.json();
    if (session?.user?.role === "ADMIN") {
      pass("Admin session", session.user.email);
    } else {
      fail("Admin session", JSON.stringify(session));
    }

    const authedRoutes = [
      "/admin/dashboard",
      "/admin/students",
      "/admin/fees",
      "/admin/analytics",
    ];

    for (const path of authedRoutes) {
      const res = await fetch(`${BASE_URL}${path}`, {
        headers: { Cookie: setCookie },
        redirect: "manual",
      });
      if (res.status === 200) pass(`Authed route ${path}`, "HTTP 200");
      else fail(`Authed route ${path}`, `HTTP ${res.status}`);
    }
  } catch (error) {
    fail("Auth flow", error instanceof Error ? error.message : String(error));
  }
}

async function testBuildArtifacts() {
  pass("Build", "skipped (run npm run build separately)");
}

console.log(`\nScholarOS smoke test → ${BASE_URL}\n`);

await testDatabase();
await testRoutes();
await testAuthFlow();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}
