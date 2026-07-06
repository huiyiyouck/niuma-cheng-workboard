import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parseRemoteSources, discoverProjectsAcross, collectAllowedProjectIds } from "./claude-sync.js";

test("collectAllowedProjectIds：展平 ecosystem + 各项目的 claude_project_id（字符串或数组），忽略缺失", () => {
  const config = {
    ecosystem: { claude_project_id: ["-Users-ck-Project-niuma-cheng", "-root-Project"] },
    projects: [
      { id: "xiaobao", claude_project_id: ["-Users-ck-Project-niuma-cheng-niuma-cheng-xiaobao", "-root-Project-niuma-cheng-xiaobao"] },
      { id: "ai", claude_project_id: "-root-Project-niuma-cheng-ai" }, // 兼容单字符串
      { id: "coordination" }, // 无 claude_project_id，跳过
    ],
  };
  const allowed = collectAllowedProjectIds(config);
  assert.ok(allowed.has("-Users-ck-Project-niuma-cheng"));
  assert.ok(allowed.has("-root-Project"));
  assert.ok(allowed.has("-root-Project-niuma-cheng-ai"));
  assert.ok(allowed.has("-root-Project-niuma-cheng-xiaobao"));
  assert.ok(!allowed.has("-Users-ck-Downloads")); // 未配置目录不在白名单
  assert.equal(allowed.size, 5);
});

test("collectAllowedProjectIds：空配置返回空集合", () => {
  assert.equal(collectAllowedProjectIds({}).size, 0);
  assert.equal(collectAllowedProjectIds(null).size, 0);
});

test("parseRemoteSources：逗号分隔、去空白、空值返回空数组", () => {
  assert.deepEqual(parseRemoteSources("zijie"), ["zijie"]);
  assert.deepEqual(parseRemoteSources(" zijie , aliyun "), ["zijie", "aliyun"]);
  assert.deepEqual(parseRemoteSources(""), []);
  assert.deepEqual(parseRemoteSources(undefined), []);
});

test("discoverProjectsAcross：合并多个目录的项目，跳过不存在的目录", async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "claude-sync-"));
  try {
    const local = path.join(base, "local");
    const mirror = path.join(base, "mirror-zijie");
    await mkdir(path.join(local, "-Users-ck-Project-a"), { recursive: true });
    await mkdir(path.join(mirror, "-root-Project-a"), { recursive: true });
    await writeFile(path.join(local, "-Users-ck-Project-a", "s1.jsonl"), "");

    const projects = await discoverProjectsAcross([local, mirror, path.join(base, "不存在")]);
    const ids = projects.map((p) => p.id).sort();
    assert.deepEqual(ids, ["-Users-ck-Project-a", "-root-Project-a"].sort());
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
