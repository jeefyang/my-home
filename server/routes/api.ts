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

useUserApi(router);
usePageApi(router);
useItemApi(router);

// 工具集
useToolsImgApi(router);
useToolsUrlApi(router);

// 读取文件
router.get("/files/:objType/:uuid/:filename", async (req, res, next) => {

    const { objType, uuid, filename } = req.params;
    const validTypes = ["users", "pages", "items"] as const;

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
    else if (objType == 'items') {
        path.resolve(path.join(DATA_DIR, itemsFolder, uuid, filesFolder, filename));
    }
    if (!p || !fs.existsSync(p)) {
        return res.status(404).send(404);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return res.sendFile(p);
});

// 1. 配置存储引擎
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { objType, uuid } = req.params as Record<string, string>;
        const p = path.join(DATA_DIR, objType, uuid, filesFolder);
        cb(null, p); // 文件保存路径
    },
    filename: (req, file, cb) => {
        let filename = req.query.filename as string || "";
        if (!filename) {
            filename = nanoid(16);
            if (req.query.prifix) {
                filename = req.query.prifix + filename;
            }
            if (req.query.extname) {
                filename = filename + '.' + req.query.extname;
            }
            else {
                filename = filename + path.extname(file.originalname);
            }
        }
        cb(null, filename);
    }
});

// 2. 配置过滤和限制
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 限制 100MB
    },
    fileFilter: (req, file, cb) => {
        // const filetypes = /jpeg|jpg|png|pdf/;
        // const mimetype = filetypes.test(file.mimetype);
        // const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        // if (mimetype && extname) {
        //     return cb(null, true);
        // }
        // cb(new Error('只支持图片(jpg/png)和PDF文件！'));
        return cb(null, true);
    }
});

// 上传文件
router.post('/upload/file/:objType/:uuid', async (req, res, next) => {
    // if (!req.file) {
    //     return res.status(400).json({
    //         code: 400,
    //         msg: "请选择文件！"
    //     });
    // }
    const check = await verifyUserFromReq(req as any);
    if (check) {
        return res.status(401).json(check);
    }
    const { objType, uuid } = req.params as Record<string, string>;

    // --- A. 校验 objType ---
    const validTypes = ["users", "pages", "items"];
    if (!validTypes.includes(objType)) {
        // 如果类型不对，直接阻断，响应 400
        // 注意：这里被阻断后，根本不会进入到后面的 Multer 中间件，文件也不会被保存！
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

}, upload.single("file"), (req, res) => {
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

