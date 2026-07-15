// ==UserScript==
// @name         导航面板书签助手
// @namespace    https://github.com/your-name/my-home
// @version      1.5.3
// @description  右键 → Tampermonkey → 添加到导航面板书签 → 添加书签
// @description  改进书签保存逻辑和增加一键快速保存
// @author       you
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    function nanoid(s) { s = s || 10; const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'; let id = ''; const a = new Uint8Array(s); crypto.getRandomValues(a); for (let i = 0; i < s; i++) id += c[a[i] % c.length]; return id; }

    const SK = 'nab_config';
    function loadC() { try { return JSON.parse(GM_getValue(SK, '{}')); } catch { return {}; } }
    function saveC(c) { GM_setValue(SK, JSON.stringify(c)); }
    function setC(k, v) { const c = loadC(); c[k] = v; saveC(c); }

    function gmFetch(url, opts) {
        return new Promise(resolve => {
            const c = loadC(); const isFD = opts.data instanceof FormData; const h = { pathid: c.pathid || '', secondcode: c.secondcode || '' };
            if (!isFD) h['Content-Type'] = 'application/json'; if (opts.headers) Object.assign(h, opts.headers);
            GM_xmlhttpRequest({
                method: opts.method || 'POST', url, headers: h, data: opts.data,
                onload: r => { try { resolve(JSON.parse(r.responseText)); } catch { resolve({ code: 500, msg: '响应解析失败' }); } },
                onerror: () => resolve({ code: 500, msg: '网络错误' })
            });
        });
    }

    function apiUrl(c, p) { return c.serverUrl.replace(/\/+$/, '') + '/' + p.replace(/^\/+/, ''); }
    function apiPost(p, b) { return gmFetch(apiUrl(loadC(), p), { method: 'POST', data: JSON.stringify(b) }); }

    function uploadIcon(b64) {
        const c = loadC(); const itemType = c.itemType || 'bookmark'; const url = apiUrl(c, 'api/upload/file/items/' + itemType + '/' + c.itemUUID);
        const a = b64.split(','), mime = a[0].match(/:(.*?);/)[1], bin = atob(a[1]);
        const ext = (mime.split('/')[1] || 'png').replace(/[^a-z0-9]/g, '');
        const bd = '----nab' + Date.now(); const enc = new TextEncoder();
        const head = enc.encode('--' + bd + '\r\nContent-Disposition: form-data; name="file"; filename="favcon.' + ext + '"\r\nContent-Type: ' + mime + '\r\n\r\n');
        const tail = enc.encode('\r\n--' + bd + '--\r\n');
        const body = new Uint8Array(head.length + bin.length + tail.length);
        body.set(head, 0); for (let i = 0; i < bin.length; i++) body[head.length + i] = bin.charCodeAt(i); body.set(tail, head.length + bin.length);
        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'POST', url,
                headers: { 'Content-Type': 'multipart/form-data; boundary=' + bd, pathid: c.pathid || '', secondcode: c.secondcode || '' },
                data: body,
                onload: r => { try { resolve(JSON.parse(r.responseText)); } catch { resolve({ code: 500, msg: '响应解析失败' }); } },
                onerror: () => resolve({ code: 500, msg: '网络错误' })
            });
        });
    }

    async function fetchTree() {
        const c = loadC(); if (!c.serverUrl || !c.pathid || !c.itemUUID || !c.bookmarkUUID) return null;
        const r = await apiPost('api/item/getItemData', { itemType: 'bookmark', itemUUID: c.itemUUID, filename: 'collection-' + c.bookmarkUUID + '.json' });
        if (r.code === 200 && r.data) { try { return JSON.parse(r.data); } catch { return []; } }
        return [];
    }

    async function addBM(tree, item, fp) {
        const c = loadC(); let t = tree;
        for (const u of fp) { const f = t.find(x => x.uuid === u && x.isFolder); if (!f) break; if (!f.children) f.children = []; t = f.children; }
        t.push(item);
        return apiPost('api/item/updateItemData', { itemType: 'bookmark', itemUUID: c.itemUUID, filename: 'collection-' + c.bookmarkUUID + '.json', content: JSON.stringify(tree) });
    }

    // ===== 弹窗 =====
    let dlg = null;

    function openDlg() {
        if (dlg) { dlg.remove(); dlg = null; }
        const cfg = loadC(); const savedPath = cfg.lastFolderPath || [];

        dlg = document.createElement('div'); dlg.id = 'nab-dlg';
        dlg.innerHTML = `<div class="no"><div class="nd"><div class="nh"><span>📑 添加到导航面板</span><span class="nx">&times;</span></div>
<div class="ndup"></div>
<div class="nb">
<div class="ns"><div class="nt">🌐 网页信息</div>
<label>标题</label><input class="nbi npt"><label>URL</label><input class="nbi npu" readonly>
<label>图标</label><div style="display:flex;gap:6px;align-items:center"><input class="nbi npic" style="flex:1" placeholder="自动获取"><img class="nip" style="width:24px;height:24px;border-radius:4px;object-fit:contain;display:none;flex-shrink:0"></div></div>
<div class="ns"><div class="nt">📂 目标文件夹 <span class="nfp" style="font-weight:400;text-transform:none;font-size:11px;color:#888">根目录</span></div>
<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px"><button class="nb-btn nbs nfu">⬆ 上层</button><button class="nb-btn nbs nrt">🔄 刷新</button></div>
<div class="nfl"></div></div>
<div class="ns"><div class="nt">🔗 服务器连接</div>
<div style="display:flex;gap:6px;margin-bottom:6px"><button class="nb-btn nbs ni">📥 导入 JSON</button></div>
<textarea class="nbi nji" rows="2" placeholder="粘贴连接信息 JSON" style="display:none;font-size:11px;font-family:monospace"></textarea>
<label>服务器地址</label><input class="nbi nsu"><label>PathID</label><input class="nbi npi"><label>SecondCode</label><input class="nbi nsci" type="password">
<label>项目UUID</label><input class="nbi niui"><label>收藏夹UUID</label><div style="display:flex;gap:6px"><input class="nbi nbui" style="flex:1"><button class="nb-btn nbs nrb">🔄</button></div><div class="nbnt" style="font-size:11px;color:#409eff;padding:2px 0 4px;display:none"></div></div>
</div><div class="nf"><span class="nst"></span><div style="display:flex;gap:8px"><button class="nb-btn nbc">取消</button><button class="nb-btn nbp nba">添加到书签</button></div></div></div></div>`;
        document.body.appendChild(dlg);

        if (!document.getElementById('nab-s')) {
            const s = document.createElement('style'); s.id = 'nab-s';
            s.textContent = `.no{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;color:#333}
.nd{background:#fff;border-radius:10px;width:400px;max-width:92vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,0.25)}
.nh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #eee;font-weight:600;font-size:15px;-webkit-user-select:none;user-select:none}
.nx{cursor:pointer;font-size:22px;color:#999;line-height:1}.nx:hover{color:#333}
.nb{padding:12px 16px;overflow-y:auto;flex:1}.ns{margin-bottom:12px}
.nt{font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}
.nbi{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:5px;font-size:13px;margin-bottom:6px;outline:none}
.nbi:focus{border-color:#409eff}
.nb-btn{padding:6px 14px;border:none;border-radius:5px;cursor:pointer;font-size:13px;white-space:nowrap;-webkit-user-select:none;user-select:none}
.nbs{padding:4px 10px;font-size:12px}
.nbp{background:#409eff;color:#fff}.nbp:hover{background:#337ecc}
.nbc{background:#f0f0f0;color:#666}.nbc:hover{background:#e0e0e0}
.nf{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid #eee}
.nst{font-size:12px;color:#888}
.nfl{max-height:180px;overflow-y:auto;margin-top:4px;border:1px solid #eee;border-radius:5px;padding:4px;-webkit-user-select:none;user-select:none}
.nfl>div{padding:6px 8px;cursor:pointer;border-radius:4px;font-size:13px;-webkit-user-select:none;user-select:none}
.nfl>div:hover{background:#f5f7fa}
label{font-size:12px;color:#666;display:block;margin-bottom:2px}
.ndup{padding:6px 16px;font-size:12px;min-height:0;border-bottom:1px solid #f0f0f0;word-break:break-all}`;
            document.head.appendChild(s);
        }

        const $ = s => dlg.querySelector(s);
        const el = {
            o: $('.no'), x: $('.nx'), cc: $('.nbc'), dup: $('.ndup'),
            ij: $('.ni'), ji: $('.nji'),
            su: $('.nsu'), pi: $('.npi'), sci: $('.nsci'), iui: $('.niui'), bui: $('.nbui'),
            pt: $('.npt'), pu: $('.npu'), pic: $('.npic'), ip: $('.nip'),
            fp: $('.nfp'), fl: $('.nfl'),
            fu: $('.nfu'), rt: $('.nrt'), rb: $('.nrb'),
            ab: $('.nba'), st: $('.nst'), bnt: $('.nbnt'),
        };

        el.su.value = cfg.serverUrl || ''; el.pi.value = cfg.pathid || ''; el.sci.value = cfg.secondcode || '';
        el.iui.value = cfg.itemUUID || ''; el.bui.value = cfg.bookmarkUUID || '';
        el.pt.value = document.title; el.pu.value = location.href;
        getIcon().then(b => { if (b) { el.pic.value = b; el.ip.src = b; el.ip.style.display = 'block'; } });

        // JSON 导入
        el.ij.addEventListener('click', () => {
            if (el.ji.style.display === 'none') { el.ji.style.display = 'block'; el.ji.value = ''; el.ji.focus(); el.ij.textContent = '✅ 解析'; return; }
            try {
                const j = JSON.parse(el.ji.value.trim());
                if (j.serverUrl) el.su.value = j.serverUrl; if (j.pathid) el.pi.value = j.pathid;
                if (j.secondcode !== undefined) el.sci.value = j.secondcode;
                if (j.itemUUID) el.iui.value = j.itemUUID; if (j.itemType) setC('itemType', j.itemType);
                if (j.bookmarkUUID) el.bui.value = j.bookmarkUUID;
                // 保存到 config 再加载
                save();
                // 切换了页签则清空文件夹路径
                if (j.bookmarkUUID && j.bookmarkUUID !== cfg.bookmarkUUID) {
                    cp = [];
                    setC('lastFolderPath', []);
                }
                el.ji.style.display = 'none'; el.ij.textContent = '📥 导入 JSON';
                el.st.textContent = '✅ 已导入，正在连接…';
                if (j.serverUrl && j.pathid && j.itemUUID && j.bookmarkUUID) { refreshBookmarkList(true); load(); }
            } catch { el.st.textContent = 'JSON 格式错误'; }
        });

        // 文件夹
        let tree = [], cp = [];
        if (savedPath.length) cp = savedPath.slice();

        function render() {
            let items = tree;
            for (const u of cp) { const f = items.find(x => x.uuid === u && x.isFolder); if (!f || !f.children) { cp = []; items = tree; break; } items = f.children; }
            let ps = '根目录';
            if (cp.length) { let s = tree, n = []; for (const u of cp) { const f = s.find(x => x.uuid === u); if (f) { n.push(f.title); s = f.children || []; } else break; } ps = n.join(' / '); }
            el.fp.textContent = ps;
            el.fl.innerHTML = '';
            let hf = false;
            for (const it of items) { if (!it.isFolder) continue; hf = true; const d = document.createElement('div'); d.textContent = '📁 ' + (it.title || '未命名'); d.addEventListener('click', () => { cp.push(it.uuid); setC('lastFolderPath', cp); render(); }); el.fl.appendChild(d); }
            if (!hf) el.fl.innerHTML = '<div style="padding:10px;text-align:center;color:#aaa;font-size:12px">此目录下没有文件夹</div>';
            setC('lastFolderPath', cp);
        }

        function findUrl(items, url, path) {
            for (const item of items) {
                if (!item.isFolder && item.url === url) return { found: true, path: path.slice(), title: item.title };
                if (item.children && item.children.length > 0) {
                    const r = findUrl(item.children, url, [...path, item.title]);
                    if (r) return r;
                }
            }
            return null;
        }

        function checkDup() {
            const url = el.pu.value.trim();
            if (!url || tree.length === 0) { if (el.dup) el.dup.innerHTML = ''; return; }
            const r = findUrl(tree, url, []);
            if (el.dup) {
                if (r) {
                    const p = r.path.length ? r.path.join(' / ') : '根目录';
                    el.dup.innerHTML = '⚠️ 该书签已存在: <span style="color:#e88080">' + p + '</span> → ' + r.title;
                } else {
                    el.dup.innerHTML = '';
                }
            }
        }

        // 收藏夹名称显示
        let curBookmarkTitle = '';
        let bookmarkListCache = [];

        function updateBookmarkTitle() {
            const c = loadC();
            const found = bookmarkListCache.find(b => b.uuid === c.bookmarkUUID);
            curBookmarkTitle = found ? found.title : (c.bookmarkUUID ? '?' : '');
            if (el.bnt) {
                el.bnt.textContent = curBookmarkTitle ? '📁 ' + curBookmarkTitle : '';
                el.bnt.style.display = curBookmarkTitle ? 'block' : 'none';
            }
        }

        async function load() {
            el.st.textContent = '正在加载… [' + (curBookmarkTitle || '?') + ']';
            const t = await fetchTree();
            if (t === null) { el.st.textContent = '请先配置服务器连接'; return; }
            tree = Array.isArray(t) ? t : [];
            if (cp.length) { let ok = true, s = tree; for (const u of cp) { const f = s.find(x => x.uuid === u && x.isFolder); if (!f) { ok = false; break; } s = f.children || []; } if (!ok) cp = []; }
            render();
            el.st.innerHTML = '<b>[' + (curBookmarkTitle || '?') + ']</b> 已加载 ' + tree.length + ' 个根条目';
            checkDup();
            // 如果还没获取过收藏夹名称，尝试获取
            if (bookmarkListCache.length === 0) refreshBookmarkList(true);
        }

        async function refreshBookmarkList(skipLoad) {
            const c = loadC();
            if (!c.serverUrl || !c.pathid || !c.itemUUID) return;
            const r = await apiPost('api/item/getItemData', { itemType: 'bookmark', itemUUID: c.itemUUID, filename: 'bookmarkList.json' });
            if (r.code === 200 && r.data) { try { bookmarkListCache = JSON.parse(r.data); updateBookmarkTitle(); } catch { } }
            if (!skipLoad) load();
        }

        el.rb.addEventListener('click', () => refreshBookmarkList());

        el.rt.addEventListener('click', load);
        el.fu.addEventListener('click', () => { if (cp.length) { cp.pop(); setC('lastFolderPath', cp); render(); } });

        function save() {
            setC('serverUrl', el.su.value.trim()); setC('pathid', el.pi.value.trim());
            setC('secondcode', el.sci.value.trim()); setC('itemUUID', el.iui.value.trim());
            setC('bookmarkUUID', el.bui.value.trim());
        }
        // 添加
        el.ab.addEventListener('click', async () => {
            save(); el.st.textContent = '正在添加…'; el.ab.disabled = true;
            let iconF = '';
            const ic = el.pic.value.trim();
            if (ic && ic.startsWith('data:')) {
                const ur = await uploadIcon(ic);
                if (ur.code === 200 && ur.data && ur.data.filename) iconF = ur.data.filename;
                else { el.st.textContent = '图标上传失败: ' + (ur.msg || ''); el.ab.disabled = false; return; }
            } else if (ic && (ic.startsWith('http:') || ic.startsWith('https:'))) {
                iconF = ic;
            }
            const t = await fetchTree();
            if (!t) { el.st.textContent = '获取书签树失败'; el.ab.disabled = false; return; }
            const ni = { uuid: nanoid(10), title: el.pt.value.trim() || document.title, url: el.pu.value || location.href, icon: iconF, isFolder: false, creatTime: Date.now(), modifyTime: Date.now(), children: [] };
            const r = await addBM(t, ni, cp.slice());
            if (r.code === 200) { el.st.textContent = '✅ 添加成功！'; setTimeout(() => { dlg.remove(); dlg = null; }, 1200); }
            else {
                el.st.textContent = '添加失败: ' + (r.msg || '');
                el.ab.disabled = false;
            }
        });

        el.o.addEventListener('click', e => { if (e.target === el.o) close(); });
        el.x.addEventListener('click', close);
        el.cc.addEventListener('click', close);
        function close() { if (dlg) { dlg.remove(); dlg = null; } }

        if (cfg.serverUrl && cfg.pathid && cfg.itemUUID && cfg.bookmarkUUID) load();
    }

    // ===== 工具 =====
    function getIcon() {
        return new Promise(resolve => {
            const icon = document.querySelector('link[rel*="icon"]') || document.querySelector('link[rel="shortcut icon"]');
            const url = icon ? icon.href : (location.origin + '/favicon.ico');
            if (!url || url.startsWith('data:')) { resolve(url || ''); return; }
            // 先试带 CORS（能转 base64 上传到服务器）
            const tryLoad = (useCors) => {
                const img = new Image();
                if (useCors) img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        c.width = img.naturalWidth || 32;
                        c.height = img.naturalHeight || 32;
                        c.getContext('2d').drawImage(img, 0, 0);
                        resolve(c.toDataURL('image/png'));
                    } catch {
                        // CORS 失败也能显示图片，直接返回 URL
                        resolve(url);
                    }
                };
                img.onerror = () => {
                    if (useCors) {
                        // CORS 方式加载失败，换无 CORS 重试
                        tryLoad(false);
                    } else {
                        resolve('');
                    }
                };
                img.src = url;
            };
            tryLoad(true);
        });
    }

    // ===== 触发 =====
    // openDlg();

    GM_registerMenuCommand("添加书签", function () {
        openDlg();
    });

    GM_registerMenuCommand('一键添加', async () => {
        const c = loadC();
        if (!c.serverUrl || !c.pathid || !c.itemUUID || !c.bookmarkUUID) {
            alert('请先配置服务器信息');
            return;
        }
        const title = document.title;
        const url = location.href;
        // 获取当前配置的收藏夹数据
        const r = await apiPost('api/item/getItemData', {
            itemType: 'bookmark', itemUUID: c.itemUUID,
            filename: 'collection-' + c.bookmarkUUID + '.json'
        });
        if (r.code !== 200) { alert('获取收藏夹失败'); return; }
        let tree = r.data ? JSON.parse(r.data) : [];
        // 添加到根目录
        tree.push({ uuid: nanoid(), title, url, icon: '', isFolder: false });
        await apiPost('api/item/updateItemData', {
            itemType: 'bookmark', itemUUID: c.itemUUID,
            filename: 'collection-' + c.bookmarkUUID + '.json',
            content: JSON.stringify(tree)
        });
        alert('已添加：' + title);
    });
})();
