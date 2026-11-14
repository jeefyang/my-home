#!/usr/bin/env node
/**
 * 安全边界回归检查（零依赖）
 * 用法：pnpm build && node scripts/security-check.mjs
 * 使用临时 DATA_DIR，不会碰真实 data/。
 */
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = 4197 + Math.floor(Math.random() * 200);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "my-home-sec-"));

const results = [];
function check(name, fn) {
    try {
        fn();
        results.push({ name, ok: true });
        console.log(`  PASS  ${name}`);
    } catch (err) {
        results.push({ name, ok: false, err });
        console.log(`  FAIL  ${name}\n        ${err.message}`);
    }
}

async function api(method, urlPath, { body, headers = {} } = {}) {
    const res = await fetch(BASE + urlPath, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = { raw: text };
    }
    return { status: res.status, json, text };
}

/** 用 node:http 发送未规范化路径，验证 SPA fallback 不会跳出 dist/client */
function rawGet(rawPath, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port: PORT, path: rawPath, method: "GET", headers }, (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve({ status: res.statusCode, text: data, headers: res.headers }));
        });
        req.on("error", reject);
        req.end();
    });
}

async function waitForHealth(timeoutMs = 20000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        try {
            const res = await fetch(BASE + "/health");
            if (res.ok) return;
        } catch {
            // 还没起来
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error("服务在 20s 内没有启动");
}

let child;
try {
    child = spawn(process.execPath, ["dist/server/index.cjs"], {
        cwd: ROOT,
        env: { ...process.env, NODE_ENV: "production", SERVER_PORT: String(PORT), DATA_DIR },
        stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c));
    child.on("exit", (code) => {
        if (code !== 0 && code !== null) console.error("server exited:", code, stderr);
    });

    await waitForHealth();

    // 1. 首启自动创建管理员，并拿到凭据
    const first = await api("GET", "/api/user/getUser");
    check("首启自动创建管理员", () => {
        assert.equal(first.status, 200);
        assert.equal(first.json.data.type, "admin");
        assert.ok(first.json.data.pathID);
    });
    const adminHeaders = {
        pathid: first.json.data.pathID,
        secondcode: first.json.data.secondCode || "",
    };

    // 2. SPA fallback 路径穿越
    const trav = await rawGet("/../package.json");
    check("SPA fallback 不泄露 dist/client 之外的文件", () => {
        assert.equal(trav.status, 200);
        assert.ok(trav.text.toLowerCase().includes("<!doctype html"));
        assert.ok(!trav.text.includes('"name": "my-home"'));
    });

    // 2.1 静态资源传输优化：index.html 不缓存，带指纹的产物 gzip + 长缓存
    const indexHtml = fs.readFileSync(path.join(ROOT, "dist", "client", "index.html"), "utf-8");
    const mainAsset = indexHtml.match(/assets\/[^"']+\.js/)?.[0];
    check("index.html 不被强缓存", () => {
        assert.equal(trav.headers["cache-control"], "no-cache");
        assert.ok(trav.text.toLowerCase().includes("<!doctype html"));
    });
    const asset = await rawGet("/" + (mainAsset || "assets/missing.js"), { "Accept-Encoding": "gzip" });
    check("带指纹的 js 走 gzip 且可长缓存", () => {
        assert.ok(mainAsset, "dist/client/index.html 里找不到 js 入口");
        assert.equal(asset.status, 200);
        assert.equal(asset.headers["content-encoding"], "gzip");
        assert.equal(asset.headers["cache-control"], "public, max-age=31536000, immutable");
    });

    // 3. 未认证接口一律 401
    const noAuthUser = await api("GET", "/api/user/getUser");
    check("未认证 getUser 返回 401（已有用户时）", () => {
        assert.equal(noAuthUser.status, 401);
        assert.equal(noAuthUser.json.code, 401);
    });
    const noAuthCreate = await api("POST", "/api/user/createUser", { body: { type: "admin" } });
    check("未认证 createUser 返回 401", () => {
        assert.equal(noAuthCreate.status, 401);
    });
    const noAuthPages = await api("POST", "/api/page/getPageList", { body: {} });
    check("未认证 getPageList 返回 401", () => {
        assert.equal(noAuthPages.status, 401);
    });

    // 4. 普通用户不能自建管理员
    const created = await api("POST", "/api/user/createUser", { body: { type: "user" }, headers: adminHeaders });
    check("管理员可以创建普通用户", () => {
        assert.equal(created.status, 200);
        assert.equal(created.json.data.type, "user");
    });
    const normalHeaders = {
        pathid: created.json.data.pathID,
        secondcode: created.json.data.secondCode || "",
    };
    const escalate = await api("POST", "/api/user/createUser", { body: { type: "admin" }, headers: normalHeaders });
    check("普通用户不能创建管理员", () => {
        assert.equal(escalate.status, 401);
    });

    // 5. 页面归属隔离
    const init = await api("POST", "/api/page/initPages", { body: {}, headers: adminHeaders });
    const adminPageUUID = init.json.data?.[0]?.uuid;
    check("管理员可以初始化页面", () => {
        assert.equal(init.status, 200);
        assert.ok(Array.isArray(init.json.data));
        assert.ok(adminPageUUID);
    });
    const steal = await api("GET", `/api/page/getPage?uuid=${adminPageUUID}`, { headers: normalHeaders });
    check("普通用户读取他人页面返回 403", () => {
        assert.equal(steal.status, 403);
        assert.equal(steal.json.code, 403);
    });
    const filtered = await api("POST", "/api/page/getPageList", {
        body: { uuidList: [adminPageUUID] },
        headers: normalHeaders,
    });
    check("getPageList 只返回自己的页面", () => {
        assert.equal(filtered.status, 200);
        assert.deepEqual(filtered.json.data, []);
    });
    const pageData = await api("POST", "/api/page/getPageData", {
        body: { pageUUID: adminPageUUID, filename: "theme.json" },
        headers: normalHeaders,
    });
    check("普通用户读取他人页面数据返回 403", () => {
        assert.equal(pageData.status, 403);
    });

    // 5.1 元件归属隔离：initPages 的模板里第二页有 www 元件
    const adminItemUUID = (init.json.data || [])
        .flatMap((pg) => (pg.itemGroupList || []).flatMap((g) => g.list || []))
        .find((it) => it && it.uuid)?.uuid;
    check("初始化页面里包含可测试元件", () => {
        assert.ok(adminItemUUID);
    });
    const itemSteal = await api("POST", "/api/item/getItemData", {
        body: { itemType: "www", itemUUID: adminItemUUID, filename: "data.json" },
        headers: normalHeaders,
    });
    check("普通用户读取他人元件数据返回 403", () => {
        assert.equal(itemSteal.status, 403);
        assert.equal(itemSteal.json.code, 403);
    });
    const itemNoAuth = await api("POST", "/api/item/getItemData", {
        body: { itemType: "www", itemUUID: adminItemUUID, filename: "data.json" },
    });
    check("未认证 getItemData 返回 401", () => {
        assert.equal(itemNoAuth.status, 401);
    });

    // 6. 上传文件名 / 扩展名校验
    async function upload(query, filename, type) {
        const form = new FormData();
        form.append("file", new Blob(["hello"], { type }), filename);
        const res = await fetch(BASE + `/api/upload/file/users/${adminHeaders.pathid}?${query}`, {
            method: "POST",
            headers: { pathid: adminHeaders.pathid, secondcode: adminHeaders.secondcode },
            body: form,
        });
        return { status: res.status, json: await res.json().catch(() => ({})) };
    }
    const traversalUpload = await upload("filename=..%2F..%2Fevil.png", "evil.png", "image/png");
    check("上传文件名含 ../ 被拒绝", () => {
        assert.equal(traversalUpload.status, 400);
    });
    const htmlUpload = await upload("filename=x.html", "x.html", "text/html");
    check("上传 .html 被拒绝", () => {
        assert.equal(htmlUpload.status, 400);
    });
    const okUpload = await upload("filename=ok.png", "ok.png", "image/png");
    check("合法的 png 可以上传", () => {
        assert.equal(okUpload.status, 200);
    });

    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} 通过`);
    if (failed.length) process.exitCode = 1;
} catch (err) {
    console.error(err);
    process.exitCode = 1;
} finally {
    if (child) child.kill();
    try {
        fs.rmSync(DATA_DIR, { recursive: true, force: true });
    } catch {
        // ignore
    }
}