import { Router } from 'express';
import { useUserApi } from './userApi';
import { usePageApi } from './pageApi';
import { useItemApi } from './itemApi';
import { useToolsImgApi } from './tools/imgApi';
import path from 'path';
import fs from "fs";
import { DATA_DIR, filesFolder, itemsFolder, PagesFolder, UsersFolder } from '../stores/data';
import { UrlsUtils } from '../utils/urls';

const router: Router = Router();

useUserApi(router);
usePageApi(router);
useItemApi(router);

// 工具集
useToolsImgApi(router);


// 文件读取

router.get("/files/users/:pathID/:filename", async (req, res) => {
    if (!UrlsUtils.checkSinglePath(req.params.pathID, req.params.filename)) {
        return res.status(404).send(404)
    }
    const p = path.resolve(path.join(DATA_DIR, UsersFolder, req.params.pathID, filesFolder, req.params.filename));
    if (!fs.existsSync(p)) {
        return res.status(404).send(404);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return res.sendFile(p);
});

router.get("/files/pages/:uuid/:filename", async (req, res) => {
    if (!UrlsUtils.checkSinglePath(req.params.uuid, req.params.filename)) {
        return res.status(404).send(404)
    }
    const p = path.resolve(path.join(DATA_DIR, PagesFolder, req.params.uuid, filesFolder, req.params.filename));
    if (!fs.existsSync(p)) {
        return res.status(404).send(404);

    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return res.sendFile(p);
});

router.get("/files/items/:uuid/:filename", async (req, res) => {
    if (!UrlsUtils.checkSinglePath(req.params.uuid, req.params.filename)) {
        return res.status(404).send(404)
    }
    const p = path.resolve(path.join(DATA_DIR, itemsFolder, req.params.uuid, filesFolder, req.params.filename));
    if (!fs.existsSync(p)) {
        return res.status(404).send(404);

    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return res.sendFile(p);
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

