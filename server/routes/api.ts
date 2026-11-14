import { Router, } from 'express';
import { useUserApi } from './userApi';
import { usePageApi } from './pageApi';
import { useItemApi } from './itemApi';
import { useToolsImgApi } from './tools/imgApi';
import path from 'path';
import fs from "fs";
import { DATA_DIR, filesFolder, itemsFolder, PagesFolder, UsersFolder } from '../stores/data';
import { UrlsUtils } from '../utils/urls';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { verifyUserFromReq } from '../stores/users';
import { useToolsUrlApi } from './tools/urlApi';

const router: Router = Router();

// 允许上传的扩展名白名单（禁止 html/svg/js 等可执行内容）
const UPLOAD_EXT_WHITELIST = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".avif",
    ".pdf", ".txt", ".json", ".zip", ".mp3", ".mp4", ".webm", ".woff", ".woff2",
]);
// 允许浏览器内联展示的扩展名，其余一律按附件下载，避免存储型 XSS
const INLINE_EXT_WHITELIST = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".avif"]);

/** 文件响应统一加安全头；非图片强制下载 */
function setFileResponseHeaders(res: any, filename: string) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    if (!INLINE_EXT_WHITELIST.has(path.extname(filename).toLowerCase())) {
        res.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent(filename));
    }
}

/** 上传前校验 query 里的文件名/前缀/扩展名，任何一项不合法直接 400 */
function validateUploadQuery(req: any, res: any, next: any) {
    const filename = typeof req.query.filename === "string" ? req.query.filename : "";
    if (filename) {
        if (!UrlsUtils.checkSinglePath(filename)) {
            return res.status(400).json({ code: 400, msg: "非法文件名" });
        }
        if (!UPLOAD_EXT_WHITELIST.has(path.extname(filename).toLowerCase())) {
            return res.status(400).json({ code: 400, msg: "不支持的文件类型" });
        }
    }
    const prifix = typeof req.query.prifix === "string" ? req.query.prifix : "";
    if (prifix && !/^[A-Za-z0-9_-]{1,40}$/.test(prifix)) {
        return res.status(400).json({ code: 400, msg: "非法文件名前缀" });
    }
    const extname = typeof req.query.extname === "string" ? req.query.extname.replace(/^\./, "") : "";
    if (extname) {
        if (!/^[a-z0-9]{1,8}$/i.test(extname) || !UPLOAD_EXT_WHITELIST.has("." + extname.toLowerCase())) {
            return res.status(400).json({ code: 400, msg: "不支持的文件类型" });
        }
    }
    next();
}

/** multer 中间件包装：把上传错误转成 JSON 400，而不是 HTML 500 */
function uploadSingle(field: string) {
    const middleware = upload.single(field);
    return (req: any, res: any, next: any) => middleware(req, res, (err: any) => {
        if (err) {
            return res.status(400).json({ code: 400, msg: err.message || "上传失败" });
        }
        next();
    });
}

useUserApi(router);
usePageApi(router);
useItemApi(router);

// 工具集
useToolsImgApi(router);
useToolsUrlApi(router);

// == 元件文件读取（目录名为 {type}-{uuid}）==
router.get("/files/items/:itemType/:itemUUID/:filename", async (req, res) => {
    const { itemType, itemUUID, filename } = req.params;
    if (!UrlsUtils.checkSinglePath(itemType, itemUUID, filename)) {
        return res.status(404).send(404);
    }
    const p = path.resolve(path.join(DATA_DIR, itemsFolder, `${itemType}-${itemUUID}`, filesFolder, filename));
    if (!fs.existsSync(p)) {
        return res.status(404).send(404);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    setFileResponseHeaders(res, filename);
    return res.sendFile(p);
});

// 读取文件（用户/页面）
router.get("/files/:objType/:uuid/:filename", async (req, res, next) => {

    const { objType, uuid, filename } = req.params;
    const validTypes = ["users", "pages"] as const;

    if (!validTypes.includes(objType as any)) {
        // 发现是非法的 objType，主动交出控制权，告诉 Express 继续往下匹配！
        return next('route');
    }
    if (!UrlsUtils.checkSinglePath(objType, uuid, filename)) {
        return res.status(404).send(404);
    }
    let p: string = "";
    if (objType == 'users') {
        p = path.resolve(path.join(DATA_DIR, UsersFolder, uuid, filesFolder, filename));
    }
    else if (objType == 'pages') {
        p = path.resolve(path.join(DATA_DIR, PagesFolder, uuid, filesFolder, filename));
    }
    if (!p || !fs.existsSync(p)) {
        return res.status(404).send(404);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    setFileResponseHeaders(res, filename);

    return res.sendFile(p);
});

// 1. 配置存储引擎
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const params = req.params as Record<string, string>;
        // 元件上传路由参数为 itemType/itemUUID，其他为 objType/uuid
        if (params.itemType && params.itemUUID) {
            const p = path.join(DATA_DIR, itemsFolder, `${params.itemType}-${params.itemUUID}`, filesFolder);
            cb(null, p);
        } else {
            const { objType, uuid } = params;
            const p = path.join(DATA_DIR, objType, uuid, filesFolder);
            cb(null, p);
        }
    },
    filename: (req, file, cb) => {
        // 自定义文件名已由 validateUploadQuery 校验过（无路径分隔符、扩展名在白名单内）
        const provided = typeof req.query.filename === "string" ? req.query.filename : "";
        if (provided) {
            return cb(null, provided);
        }
        let filename = nanoid(16);
        const prifix = typeof req.query.prifix === "string" ? req.query.prifix : "";
        if (prifix) {
            filename = prifix + filename;
        }
        const extname = typeof req.query.extname === "string" ? req.query.extname.replace(/^\./, "") : "";
        const ext = extname ? "." + extname : path.extname(file.originalname).toLowerCase();
        cb(null, filename + ext);
    }
});

// 2. 配置过滤和限制
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 限制 100MB
    },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!UPLOAD_EXT_WHITELIST.has(ext)) {
            return cb(new Error("不支持的文件类型: " + (ext || "无扩展名")));
        }
        cb(null, true);
    }
});

// == 元件文件上传（目录名为 {type}-{uuid}）==
router.post('/upload/file/items/:itemType/:itemUUID', async (req, res, next) => {
    const check = await verifyUserFromReq(req as any);
    if (check) {
        return res.status(401).json(check);
    }
    const { itemType, itemUUID } = req.params as Record<string, string>;
    if (!UrlsUtils.checkSinglePath(itemType, itemUUID)) {
        return res.status(404).send(`404 ${itemType} ${itemUUID}`);
    }
    const p = path.join(DATA_DIR, itemsFolder, `${itemType}-${itemUUID}`, filesFolder);
    if (!fs.existsSync(p)) {
        return res.status(404).send(`404 ${p}`);
    }
    next();

}, validateUploadQuery, uploadSingle("file"), (req, res) => {
    res.status(200).json({
        code: 200,
        msg: '文件上传成功',
        data: {
            filename: req.file!.filename
        }
    });

});

// 上传文件（用户/页面）
router.post('/upload/file/:objType/:uuid', async (req, res, next) => {
    const check = await verifyUserFromReq(req as any);
    if (check) {
        return res.status(401).json(check);
    }
    const { objType, uuid } = req.params as Record<string, string>;

    const validTypes = ["users", "pages"];
    if (!validTypes.includes(objType)) {
        return res.status(404).send(404);
    }
    if (!UrlsUtils.checkSinglePath(objType, uuid)) {
        return res.status(404).send(`404 ${objType} ${uuid}`);
    }
    const p = path.join(DATA_DIR, objType, uuid, filesFolder);
    if (!fs.existsSync(p)) {
        return res.status(404).send(`404 ${p}`);
    }
    next();

}, validateUploadQuery, uploadSingle("file"), (req, res) => {
    res.status(200).json({
        code: 200,
        msg: '文件上传成功',
        data: {
            filename: req.file!.filename
        }
    });

});

// 2. 【关键】在所有路由之后，定义 404 处理中间件
router.use((req, res) => {
    // 设置状态码为 404
    res.status(404);

    // 根据需求返回不同格式的响应
    // 例如，返回 JSON (适合 API)
    res.json({
        code: 404,
        msg: "请求不存在",
        err: {
            path: req.originalUrl
        }
    });
});


export default router;

