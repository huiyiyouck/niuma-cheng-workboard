import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(here, "../..");
const CONFIG = path.join(PROJECT_ROOT, "projects.config.json");
const NO_DIST = path.join(PROJECT_ROOT, "frontend", "__no_dist__");

async function withServer(opts, fn) {
  const server = createServer(opts);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    return await fn(`http://localhost:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("/api/snapshot 返回骨架快照（200 + JSON）", async () => {
  await withServer({ configPath: CONFIG, distDir: NO_DIST }, async (base) => {
    const res = await fetch(`${base}/api/snapshot`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.refreshIntervalSeconds, 60);
    assert.ok(Array.isArray(body.projects));
    assert.ok(Array.isArray(body.diagnostics));
    assert.equal(typeof body.generatedAt, "string");
  });
});

test("dist 不存在时返回首启提示页（引导 npm run build）", async () => {
  await withServer({ configPath: CONFIG, distDir: NO_DIST }, async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /npm run build/);
  });
});

test("未知 API 返回 404", async () => {
  await withServer({ configPath: CONFIG, distDir: NO_DIST }, async (base) => {
    const res = await fetch(`${base}/api/unknown`);
    assert.equal(res.status, 404);
  });
});

test("根配置不可读时 /api/snapshot 返回 500", async () => {
  await withServer({ configPath: "/no/such/config.json", distDir: NO_DIST }, async (base) => {
    const res = await fetch(`${base}/api/snapshot`);
    assert.equal(res.status, 500);
  });
});
