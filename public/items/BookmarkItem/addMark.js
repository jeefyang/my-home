// ==UserScript==
// @name         导航面板书签助手
// @namespace    https://github.com/your-name/my-home
// @version      1.6.1
// @description  右键 → Tampermonkey → 添加到导航面板书签 → 添加书签
// @description:1.5.4  1.5.4 改进书签保存逻辑和增加一键快速保存
// @description:1.6.0  1.6.0 调整样式,重新获取图标,改进一键快速保存
// @description:1.6.1  1.6.1 修复图标获取：SVG 统一转为 256x256 PNG
// @author       you
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      *
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

    // ===== 把任意 data URL 规范化为 base64 形式 =====
    function normalizeDataUrl(url) {
        if (!url || !url.startsWith('data:')) return url;
        if (/;base64,/i.test(url)) return url;
        const m = url.match(/^data:([^,]*),(.*)$/s);
        if (!m) return url;
        const mime = (m[1].split(';')[0] || 'text/plain').trim();
        let text;
        try { text = decodeURIComponent(m[2]); } catch { text = m[2]; }
        const b64 = btoa(unescape(encodeURIComponent(text)));
        return 'data:' + mime + ';base64,' + b64;
    }

    // ===== SVG data URL → 256x256 PNG base64 =====
    function svgToPngBase64(svgUrl, size = 256) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, size, size);

                    let sw = img.naturalWidth || img.width;
                    let sh = img.naturalHeight || img.height;
                    if (!sw || !sh) { sw = size; sh = size; }

                    const scale = Math.min(size / sw, size / sh);
                    const dw = sw * scale;
                    const dh = sh * scale;
                    const dx = (size - dw) / 2;
                    const dy = (size - dh) / 2;

                    ctx.drawImage(img, dx, dy, dw, dh);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    console.warn('SVG→PNG 失败', e);
                    resolve('');
                }
            };
            img.onerror = () => {
                console.warn('SVG 图片加载失败');
                resolve('');
            };
            img.src = svgUrl;
        });
    }

    function uploadIcon(b64) {
        b64 = normalizeDataUrl(b64);
        const c = loadC();
        const itemType = c.itemType || 'bookmark';
        const url = apiUrl(c, 'api/upload/file/items/' + itemType + '/' + c.itemUUID);

        const a = b64.split(',');
        const mime = a[0].match(/:(.*?);/)[1];
        const raw = a[1];

        // 扩展名映射
        let ext = 'png';
        if (mime.includes('svg')) ext = 'svg';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('gif')) ext = 'gif';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('x-icon') || mime.includes('vnd.microsoft.icon')) ext = 'ico';
        else if (mime.includes('png')) ext = 'png';

        // SVG 用 utf-8 文本编码；其余按二进制
        let bytes;
        if (ext === 'svg') {
            const text = decodeURIComponent(escape(atob(raw)));
            bytes = new TextEncoder().encode(text);
        } else {
            const bin = atob(raw);
            bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        }

        const bd = '----nab' + Date.now();
        const enc = new TextEncoder();
        const head = enc.encode(
            '--' + bd + '\r\nContent-Disposition: form-data; name="file"; filename="favcon.' + ext +
            '"\r\nContent-Type: ' + mime + '\r\n\r\n'
        );
        const tail = enc.encode('\r\n--' + bd + '--\r\n');

        const body = new Uint8Array(head.length + bytes.length + tail.length);
        body.set(head, 0);
        body.set(bytes, head.length);
        body.set(tail, head.length + bytes.length);

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: 'POST', url,
                headers: {
                    'Content-Type': 'multipart/form-data; boundary=' + bd,
                    pathid: c.pathid || '',
                    secondcode: c.secondcode || ''
                },
                data: body,
                onload: r => { try { resolve(JSON.parse(r.responseText)); } catch { resolve({ code: 500, msg: '响应解析失败' }); } },
                onerror: () => resolve({ code: 500, msg: '网络错误' })
            });
        });
    }

    async function fetchTree(errorBack) {
        const c = loadC(); if (!c.serverUrl || !c.pathid || !c.itemUUID || !c.bookmarkUUID) return null;
        const r = await apiPost('api/item/getItemData', { itemType: 'bookmark', itemUUID: c.itemUUID, filename: 'collection-' + c.bookmarkUUID + '.json' });
        if (r.code === 200 && r.data) { try { return JSON.parse(r.data); } catch { return errorBack ? null : []; } }
        return errorBack ? null : [];;
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
<div class="ns"><div class="nt">📂 目标文件夹 <span class="nfp" style="font-weight:400;text-transform:none;font-size:11px">根目录</span></div>
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
.nd{ background-color: rgba(255, 255, 255, 0.3);color: #ffffff;backdrop-filter: blur(5px);  border-radius:10px;width:400px;max-width:92vw;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,0.25)}
.nh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #eee;font-weight:600;font-size:15px;-webkit-user-select:none;user-select:none}
.nx{cursor:pointer;font-size:22px;color:#999;line-height:1}.nx:hover{color:#333}
.nb{padding:12px 16px;overflow-y:auto;flex:1}.ns{margin-bottom:12px}
.nt{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #f0f0f0}
.nbi{box-sizing:border-box;width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:5px;font-size:13px;margin-bottom:6px;outline:none}
.nbi:focus{border-color:#409eff}
.nb-btn{padding:6px 14px;border:none;border-radius:5px;cursor:pointer;font-size:13px;white-space:nowrap;-webkit-user-select:none;user-select:none}
.nbs{padding:4px 10px;font-size:12px}
.nbp{background:#409eff;color:#fff}.nbp:hover{background:#337ecc}
.nbc{background:#f0f0f0;color:#999}.nbc:hover{background:#e0e0e0}
.nf{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid #eee}
.nst{font-size:12px;}
.nfl{max-height:180px;overflow-y:auto;margin-top:4px;border:1px solid #eee;border-radius:5px;padding:4px;-webkit-user-select:none;user-select:none}
.nfl>div{padding:6px 8px;cursor:pointer;border-radius:4px;font-size:13px;-webkit-user-select:none;user-select:none}
.nfl>div:hover{background:#f5f7fa}
label{font-size:12px;display:block;margin-bottom:2px}
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
            if (!hf) el.fl.innerHTML = '<div style="padding:10px;text-align:center;opacity:0.6;font-size:12px">此目录下没有文件夹</div>';
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

    /**
     * 使用 GM_xmlhttpRequest 获取图片并转为Base64
     * SVG 走文本读取 → data URL → 再转 256x256 PNG
     */
    function fetchImageAsBase64(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'blob',
                onload: function (response) {
                    if (response.status === 200) {
                        const blob = response.response;

                        // 判断是否 SVG：优先看 blob.type，其次看 URL 后缀
                        const isSvg = (blob.type && blob.type.includes('svg')) || /\.svg(\?|#|$)/i.test(url);

                        if (isSvg) {
                            // SVG → 文本 → data:image/svg+xml;base64 → 256 PNG
                            const reader = new FileReader();
                            reader.onloadend = async function () {
                                const text = reader.result;
                                const svgB64 = 'data:image/svg+xml;base64,' +
                                    btoa(unescape(encodeURIComponent(text)));
                                const png = await svgToPngBase64(svgB64, 256);
                                resolve(png);
                            };
                            reader.onerror = reject;
                            reader.readAsText(blob, 'utf-8');
                        } else {
                            const reader = new FileReader();
                            reader.onloadend = function () {
                                const base64Data = reader.result; // 形如 "data:image/png;base64,xxxxx"
                                console.log('✅ 转换成功！');
                                console.log('Base64 长度:', base64Data.length);
                                console.log('Base64 预览:', base64Data.substring(0, 100) + '...');
                                resolve(base64Data);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        }

                    } else {
                        console.error('❌ 请求失败，状态码:', response.status);
                        reject(response.status)
                    }
                },
                onerror: function (error) {
                    console.error('❌ 请求出错:', error);
                    reject(error)
                }
            });
        })

    }

    // ===== 工具 =====
    function getIcon() {
        return new Promise(async (resolve) => {
            const icon = document.querySelector('link[rel*="icon"]') || document.querySelector('link[rel="shortcut icon"]');
            const url = icon ? icon.href : (location.origin + '/favicon.ico');
            if (!url) { resolve(''); return; }

            // data URL：若是 SVG，转成 256 PNG；否则规范化后返回
            if (url.startsWith('data:')) {
                const normalized = normalizeDataUrl(url);
                if (/^data:image\/svg\+xml/i.test(normalized)) {
                    const png = await svgToPngBase64(normalized, 256);
                    resolve(png);
                } else {
                    resolve(normalized);
                }
                return;
            }

            // 远程 URL（含 SVG）：GM 获取 → 转 base64 / 转 PNG
            try {
                const base64 = await fetchImageAsBase64(url);
                resolve(base64);
                return;
            }
            catch {
                console.warn("油猴获取图标失败，尝试无 CORS 获取图标")
            }

            // 回退：canvas（位图有效；SVG 走这里会失败）
            const tryLoad = (useCors) => {
                const img = new Image();
                if (useCors) img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const c = document.createElement('canvas');
                        c.width = 256;
                        c.height = 256;
                        const ctx = c.getContext('2d');
                        const sw = img.naturalWidth || 256;
                        const sh = img.naturalHeight || 256;
                        const scale = Math.min(256 / sw, 256 / sh);
                        const dw = sw * scale, dh = sh * scale;
                        ctx.drawImage(img, (256 - dw) / 2, (256 - dh) / 2, dw, dh);
                        resolve(c.toDataURL('image/png'));
                    } catch {
                        resolve('');
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

    let isQuickAdding = false
    GM_registerMenuCommand('一键添加', async () => {
        const c = loadC();
        if (!c.serverUrl || !c.pathid || !c.itemUUID || !c.bookmarkUUID) {
            alert('请先配置服务器信息');
            return;
        }
        if (isQuickAdding) {
            alert('正在添加中，请稍候');
            return;
        }

        const title = document.title.trim();
        if (!title) {
            alert('当前页面没有标题，请手动添加');
            return;
        }
        const url = location.href;
        isQuickAdding = true
        const icon = await getIcon()
        try {
            // 获取当前配置的收藏夹数据
            const tree = await fetchTree(true)
            if (!tree) { alert('获取收藏夹失败'); isQuickAdding = false; return; }
            // 添加到根目录
            const ni = { uuid: nanoid(10), title: document.title, url: location.href, icon: icon, isFolder: false, creatTime: Date.now(), modifyTime: Date.now(), children: [] };
            const r = await addBM(tree, ni, []);
            alert('已添加：' + title);
            isQuickAdding = false
        }
        catch (e) {
            alert('添加失败：' + e)
            isQuickAdding = false
        }
    });
})();