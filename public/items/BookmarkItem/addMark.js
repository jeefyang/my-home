// ==UserScript==
// @name         导航面板书签助手
// @namespace    https://github.com/your-name/my-home
// @version      1.0.0
// @description  右键快速添加当前页面到导航面板收藏夹
// @author       you
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_info
// @run-at       context-menu
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 配置存储 ====================
    const STORAGE_KEY = 'nav_bookmark_config';

    function loadConfig() {
        try {
            return JSON.parse(GM_getValue(STORAGE_KEY, '{}'));
        } catch { return {}; }
    }

    function saveConfig(cfg) {
        GM_setValue(STORAGE_KEY, JSON.stringify(cfg));
    }

    function getConfig(key, def) {
        const cfg = loadConfig();
        return cfg[key] !== undefined ? cfg[key] : def;
    }

    function setConfig(key, val) {
        const cfg = loadConfig();
        cfg[key] = val;
        saveConfig(cfg);
    }

    // ==================== 服务器请求 ====================
    async function apiPost(url, path, body) {
        const fullUrl = url.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
        const cfg = loadConfig();
        try {
            const res = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'pathid': cfg.pathid || '',
                    'secondcode': cfg.secondcode || ''
                },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) {
            return { code: 500, msg: '网络错误: ' + e.message };
        }
    }

    async function uploadIcon(url, base64Data) {
        const cfg = loadConfig();
        const fullUrl = url.replace(/\/+$/, '') + '/api/upload/file/users/' + cfg.pathid;
        try {
            // base64 → Blob
            const arr = base64Data.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            const u8 = new Uint8Array(bstr.length);
            for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
            const blob = new Blob([u8], { type: mime });
            const ext = mime.split('/')[1];
            const file = new File([blob], 'favcon.' + ext, { type: mime });

            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'pathid': cfg.pathid, 'secondcode': cfg.secondcode },
                body: fd
            });
            return await res.json();
        } catch (e) {
            return { code: 500, msg: '图标上传失败: ' + e.message };
        }
    }

    // ==================== 获取书签树 ====================
    async function fetchBookmarkTree() {
        const cfg = loadConfig();
        if (!cfg.serverUrl || !cfg.pathid || !cfg.itemUUID || !cfg.bookmarkUUID) {
            return null;
        }
        const res = await apiPost(cfg.serverUrl, 'api/item/getItemData', {
            itemType: cfg.itemType || 'bookmark',
            itemUUID: cfg.itemUUID,
            filename: 'collection-' + cfg.bookmarkUUID + '.json'
        });
        if (res.code === 200 && res.data) {
            try { return JSON.parse(res.data); } catch { return []; }
        }
        return [];
    }

    // ==================== 添加书签 ====================
    async function addBookmarkToServer(tree, newItem, folderPath) {
        const cfg = loadConfig();

        // 按 folderPath 放入
        let target = tree;
        for (const uuid of folderPath) {
            const f = target.find(item => item.uuid === uuid && item.isFolder);
            if (!f) break;
            if (!f.children) f.children = [];
            target = f.children;
        }
        target.push(newItem);

        const res = await apiPost(cfg.serverUrl, 'api/item/updateItemData', {
            itemType: cfg.itemType || 'bookmark',
            itemUUID: cfg.itemUUID,
            filename: 'collection-' + cfg.bookmarkUUID + '.json',
            content: JSON.stringify(tree)
        });
        return res;
    }

    // ==================== UI ====================
    let dialogEl = null;
    let dialogResolve = null;

    function createDialog() {
        if (dialogEl) closeDialog();

        const cfg = loadConfig();
        dialogEl = document.createElement('div');
        dialogEl.id = 'nav-bookmark-dialog';
        dialogEl.innerHTML = `
            <div class="nab-dlg-overlay">
                <div class="nab-dlg">
                    <div class="nab-dlg-header">
                        <span>添加到导航面板</span>
                        <span class="nab-close">&times;</span>
                    </div>
                    <div class="nab-dlg-body">
                        <div class="nab-section">
                            <div class="nab-section-title">服务器连接</div>
                            <label>服务器地址</label>
                            <input class="nab-input nab-server-url" placeholder="http://192.168.1.100:3000" />
                            <label>PathID</label>
                            <input class="nab-input nab-pathid" />
                            <label>SecondCode</label>
                            <input class="nab-input nab-secondcode" type="password" />
                            <label>项目UUID</label>
                            <input class="nab-input nab-item-uuid" />
                            <label>收藏夹UUID</label>
                            <div style="display:flex;gap:6px">
                                <input class="nab-input nab-bookmark-uuid" style="flex:1" />
                                <button class="nab-btn nab-btn-sm nab-refresh-bookmarks" title="刷新收藏夹列表">🔄</button>
                            </div>
                        </div>

                        <div class="nab-section">
                            <div class="nab-section-title">目标文件夹</div>
                            <div style="display:flex;gap:6px;align-items:center">
                                <span class="nab-folder-path" style="flex:1;font-size:12px;color:#888">根目录</span>
                                <button class="nab-btn nab-btn-sm nab-folder-up" title="上层">⬆</button>
                                <button class="nab-btn nab-btn-sm nab-refresh-tree" title="刷新">🔄</button>
                            </div>
                            <div class="nab-folder-list"></div>
                        </div>

                        <div class="nab-section">
                            <div class="nab-section-title">网页信息</div>
                            <label>标题</label>
                            <input class="nab-input nab-page-title" />
                            <label>URL</label>
                            <input class="nab-input nab-page-url" readonly />
                            <label>图标</label>
                            <div style="display:flex;gap:6px;align-items:center">
                                <input class="nab-input nab-page-icon" style="flex:1" placeholder="自动获取" />
                                <img class="nab-icon-preview" style="width:24px;height:24px;border-radius:4px;object-fit:contain;display:none" />
                            </div>
                        </div>
                    </div>
                    <div class="nab-dlg-footer">
                        <span class="nab-status"></span>
                        <div style="display:flex;gap:8px">
                            <button class="nab-btn nab-btn-cancel">取消</button>
                            <button class="nab-btn nab-btn-primary nab-btn-add">添加到书签</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialogEl);

        // 注入样式
        if (!document.getElementById('nab-style')) {
            const style = document.createElement('style');
            style.id = 'nab-style';
            style.textContent = `
                .nab-dlg-overlay {
                    position: fixed; top:0; left:0; right:0; bottom:0;
                    background: rgba(0,0,0,0.4); z-index: 999999;
                    display: flex; align-items: center; justify-content: center;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 13px; color: #333;
                }
                .nab-dlg {
                    background: #fff; border-radius: 10px; width: 400px; max-width: 92vw;
                    max-height: 85vh; display: flex; flex-direction: column;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.25);
                }
                .nab-dlg-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px 16px; border-bottom: 1px solid #eee;
                    font-weight: 600; font-size: 15px;
                }
                .nab-close { cursor: pointer; font-size: 22px; color: #999; line-height:1; }
                .nab-close:hover { color: #333; }
                .nab-dlg-body { padding: 12px 16px; overflow-y: auto; flex: 1; }
                .nab-section { margin-bottom: 12px; }
                .nab-section-title {
                    font-size: 12px; font-weight: 600; color: #666;
                    text-transform: uppercase; letter-spacing: 0.5px;
                    margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #f0f0f0;
                }
                .nab-input {
                    box-sizing: border-box; width: 100%; padding: 6px 8px;
                    border: 1px solid #ddd; border-radius: 5px; font-size: 13px;
                    margin-bottom: 6px; outline: none;
                }
                .nab-input:focus { border-color: #409eff; }
                .nab-btn {
                    padding: 6px 14px; border: none; border-radius: 5px;
                    cursor: pointer; font-size: 13px; white-space: nowrap;
                }
                .nab-btn-sm { padding: 4px 8px; font-size: 13px; }
                .nab-btn-primary { background: #409eff; color: #fff; }
                .nab-btn-primary:hover { background: #337ecc; }
                .nab-btn-cancel { background: #f0f0f0; color: #666; }
                .nab-btn-cancel:hover { background: #e0e0e0; }
                .nab-dlg-footer {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 10px 16px; border-top: 1px solid #eee;
                }
                .nab-status { font-size: 12px; color: #888; }
                .nab-folder-list {
                    max-height: 150px; overflow-y: auto; margin-top: 4px;
                    border: 1px solid #eee; border-radius: 5px; padding: 4px;
                }
                .nab-folder-item {
                    padding: 5px 8px; cursor: pointer; border-radius: 4px;
                    display: flex; align-items: center; gap: 6px; font-size: 13px;
                }
                .nab-folder-item:hover { background: #f5f7fa; }
                .nab-folder-item.active { background: #ecf5ff; color: #409eff; font-weight: 600; }
                label { font-size: 12px; color: #666; display: block; margin-bottom: 2px; }
            `;
            document.head.appendChild(style);
        }

        // 绑定事件
        const els = {
            overlay: dialogEl.querySelector('.nab-dlg-overlay'),
            close: dialogEl.querySelector('.nab-close'),
            cancel: dialogEl.querySelector('.nab-btn-cancel'),
            serverUrl: dialogEl.querySelector('.nab-server-url'),
            pathid: dialogEl.querySelector('.nab-pathid'),
            secondcode: dialogEl.querySelector('.nab-secondcode'),
            itemUuid: dialogEl.querySelector('.nab-item-uuid'),
            bookmarkUuid: dialogEl.querySelector('.nab-bookmark-uuid'),
            pageTitle: dialogEl.querySelector('.nab-page-title'),
            pageUrl: dialogEl.querySelector('.nab-page-url'),
            pageIcon: dialogEl.querySelector('.nab-page-icon'),
            iconPreview: dialogEl.querySelector('.nab-icon-preview'),
            folderPath: dialogEl.querySelector('.nab-folder-path'),
            folderList: dialogEl.querySelector('.nab-folder-list'),
            folderUp: dialogEl.querySelector('.nab-folder-up'),
            refreshTree: dialogEl.querySelector('.nab-refresh-tree'),
            refreshBookmarks: dialogEl.querySelector('.nab-refresh-bookmarks'),
            addBtn: dialogEl.querySelector('.nab-btn-add'),
            status: dialogEl.querySelector('.nab-status'),
        };

        // 加载已保存配置
        els.serverUrl.value = cfg.serverUrl || '';
        els.pathid.value = cfg.pathid || '';
        els.secondcode.value = cfg.secondcode || '';
        els.itemUuid.value = cfg.itemUUID || '';
        els.bookmarkUuid.value = cfg.bookmarkUUID || '';

        // 自动填充当前页面信息
        els.pageTitle.value = document.title;
        els.pageUrl.value = window.location.href;
        getPageIconBase64().then(b64 => {
            if (b64) {
                els.pageIcon.value = b64;
                els.iconPreview.src = b64;
                els.iconPreview.style.display = 'block';
            }
        });

        // 文件夹状态
        let currentTree = [];
        let currentFolderPath = [];
        let selectedFolderUuid = getConfig('lastFolderUuid', '');

        function renderFolderList() {
            // 找当前文件夹的内容
            let items = currentTree;
            for (const uuid of currentFolderPath) {
                const f = items.find(item => item.uuid === uuid && item.isFolder);
                if (!f || !f.children) { items = []; break; }
                items = f.children;
            }

            // 面包屑
            let pathStr = '根目录';
            if (currentFolderPath.length > 0) {
                let scan = currentTree;
                const names = [];
                for (const uuid of currentFolderPath) {
                    const f = scan.find(item => item.uuid === uuid);
                    if (f) { names.push(f.title); scan = f.children || []; }
                }
                pathStr = names.join(' / ');
            }
            els.folderPath.textContent = pathStr;

            // 渲染
            els.folderList.innerHTML = '';
            if (items.length === 0) {
                els.folderList.innerHTML = '<div style="padding:10px;text-align:center;color:#aaa;font-size:12px">空目录</div>';
                return;
            }
            for (const item of items) {
                if (!item.isFolder) continue;
                const div = document.createElement('div');
                div.className = 'nab-folder-item' + (item.uuid === selectedFolderUuid ? ' active' : '');
                div.textContent = '📁 ' + item.title;
                div.addEventListener('click', () => {
                    selectedFolderUuid = item.uuid;
                    setConfig('lastFolderUuid', selectedFolderUuid);
                    renderFolderList();
                });
                div.addEventListener('dblclick', () => {
                    currentFolderPath.push(item.uuid);
                    selectedFolderUuid = '';
                    renderFolderList();
                });
                els.folderList.appendChild(div);
            }
        }

        // 刷新书签树
        async function loadTree() {
            const tree = await fetchBookmarkTree();
            if (tree === null) {
                els.status.textContent = '请先配置服务器连接';
                return;
            }
            currentTree = Array.isArray(tree) ? tree : [];
            currentFolderPath = [];
            renderFolderList();
            els.status.textContent = '已加载 ' + currentTree.length + ' 个根条目';
        }

        // 刷新收藏夹列表（通过读取 bookmarkList.json）
        els.refreshBookmarks.addEventListener('click', async () => {
            const cfg2 = loadConfig();
            if (!cfg2.serverUrl || !cfg2.pathid || !cfg2.itemUUID) {
                els.status.textContent = '请先填写服务器信息';
                return;
            }
            const res = await apiPost(cfg2.serverUrl, 'api/item/getItemData', {
                itemType: cfg2.itemType || 'bookmark',
                itemUUID: cfg2.itemUUID,
                filename: 'bookmarkList.json'
            });
            if (res.code === 200 && res.data) {
                try {
                    const list = JSON.parse(res.data);
                    // 显示收藏夹列表让用户选择
                    const uuids = list.map(b => b.uuid).join(', ');
                    els.status.textContent = '收藏夹: ' + list.map(b => b.title).join(' | ');
                    if (list.length > 0 && !els.bookmarkUuid.value) {
                        // 找默认或第一个
                        const def = list.find(b => b.isDefault) || list[0];
                        els.bookmarkUuid.value = def.uuid;
                        cfg2.bookmarkUUID = def.uuid;
                        saveConfig(cfg2);
                    }
                } catch { els.status.textContent = '解析收藏夹列表失败'; }
            } else {
                els.status.textContent = res.msg || '获取失败';
            }
        });

        els.refreshTree.addEventListener('click', loadTree);

        els.folderUp.addEventListener('click', () => {
            if (currentFolderPath.length > 0) {
                currentFolderPath.pop();
                selectedFolderUuid = '';
                renderFolderList();
            }
        });

        // 保存配置
        function saveCurrentConfig() {
            setConfig('serverUrl', els.serverUrl.value.trim());
            setConfig('pathid', els.pathid.value.trim());
            setConfig('secondcode', els.secondcode.value.trim());
            setConfig('itemUUID', els.itemUuid.value.trim());
            setConfig('bookmarkUUID', els.bookmarkUuid.value.trim());
        }

        // 添加书签
        els.addBtn.addEventListener('click', async () => {
            saveCurrentConfig();
            els.status.textContent = '正在添加…';
            els.addBtn.disabled = true;

            // 1) 上传图标
            const iconVal = els.pageIcon.value.trim();
            let iconFilename = '';
            if (iconVal && iconVal.startsWith('data:')) {
                const uploadRes = await uploadIcon(loadConfig().serverUrl, iconVal);
                if (uploadRes.code === 200 && uploadRes.data && uploadRes.data.filename) {
                    iconFilename = uploadRes.data.filename;
                } else {
                    els.status.textContent = '图标上传失败: ' + (uploadRes.msg || '');
                    els.addBtn.disabled = false;
                    return;
                }
            }

            // 2) 获取当前树
            const cfg3 = loadConfig();
            const tree = await fetchBookmarkTree();
            if (!tree) {
                els.status.textContent = '获取书签树失败';
                els.addBtn.disabled = false;
                return;
            }

            // 3) 构建新书签
            const { nanoid } = await importNanoid();
            const newItem = {
                uuid: nanoid(10),
                title: els.pageTitle.value.trim() || document.title,
                url: els.pageUrl.value || window.location.href,
                icon: iconFilename,
                isFolder: false,
                creatTime: Date.now(),
                modifyTime: Date.now(),
                children: []
            };

            // 4) 确定目标路径
            let folderPath = [];
            if (selectedFolderUuid) {
                // 找到从根到选中文件夹的路径
                folderPath = findPathToUuid(tree, selectedFolderUuid);
            }

            // 5) 提交
            const addRes = await addBookmarkToServer(tree, newItem, folderPath);
            if (addRes.code === 200) {
                els.status.textContent = '✅ 添加成功！';
                setTimeout(() => closeDialog(), 1200);
            } else {
                els.status.textContent = '添加失败: ' + (addRes.msg || '');
            }
            els.addBtn.disabled = false;
        });

        // 关闭
        const closeDialog = () => {
            if (dialogEl) {
                dialogEl.remove();
                dialogEl = null;
            }
            if (dialogResolve) { dialogResolve(); dialogResolve = null; }
        };
        els.overlay.addEventListener('click', (e) => { if (e.target === els.overlay) closeDialog(); });
        els.close.addEventListener('click', closeDialog);
        els.cancel.addEventListener('click', closeDialog);

        // 自动刷新书签树
        if (cfg.serverUrl && cfg.pathid && cfg.itemUUID && cfg.bookmarkUUID) {
            loadTree();
            els.status.textContent = '已连接';
        }

        return new Promise((resolve) => { dialogResolve = resolve; });
    }

    // ==================== 工具函数 ====================
    function getPageIconBase64() {
        return new Promise((resolve) => {
            const icon = document.querySelector('link[rel*="icon"]') || document.querySelector('link[rel="shortcut icon"]');
            const iconUrl = icon ? icon.href : (window.location.origin + '/favicon.ico');
            if (!iconUrl) { resolve(''); return; }

            // 如果已经是 data: 直接返回
            if (iconUrl.startsWith('data:')) { resolve(iconUrl); return; }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth || 32;
                c.height = img.naturalHeight || 32;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            };
            img.onerror = () => resolve('');
            img.src = iconUrl;
        });
    }

    function findPathToUuid(tree, targetUuid) {
        for (const item of tree) {
            if (item.uuid === targetUuid) return [targetUuid];
            if (item.children && item.children.length > 0) {
                const sub = findPathToUuid(item.children, targetUuid);
                if (sub.length > 0) return [item.uuid, ...sub];
            }
        }
        return [];
    }

    async function importNanoid() {
        // nanoid 的简单实现（不依赖外部库）
        const url = 'data:text/javascript;base64,' + btoa(`
            export function nanoid(size=10) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
                let id = '';
                const arr = new Uint8Array(size);
                crypto.getRandomValues(arr);
                for(let i=0;i<size;i++) id += chars[arr[i] % chars.length];
                return id;
            }
        `);
        return import(url);
    }

    // ==================== 注册右键菜单 ====================
    GM_registerMenuCommand('📑 添加到导航面板', () => {
        createDialog();
    });

    console.log('📑 导航面板书签助手已加载 — 右键页面选择「添加到导航面板」');
})();
