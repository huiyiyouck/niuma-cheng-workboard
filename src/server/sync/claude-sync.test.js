import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { parseRemoteSources, discoverProjectsAcross } from "./claude-sync.js";

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
