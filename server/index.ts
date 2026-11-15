import type { Express } from 'express';
import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import router from './routes/api';
import { dataInit, isDev } from './stores/data';



// 数据初始化
dataInit();

const app: Express = express();
console.log('当前是否为开发模式', isDev);

// 正是环境
if (!isDev) {
    // ⚠️ 关键设置：如果你的 Node 服务在生产环境中是用 Nginx 反向代理的，必须加这一句！
    // 这样 Express 才能通过 req.headers['x-forwarded-proto'] 知道真实用户用的是不是 HTTPS
    app.set('trust proxy', 1);

    app.use((req, res, next) => {
        // 判断当前请求是否是 HTTPS 
        // req.secure 适用于直接用 Node 启 HTTPS； x-forwarded-proto 适用于 Nginx 代理 HTTPS
        const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

        if (isHttps) {
            // 🔒 线上 HTTPS 环境：直接使用默认的最严安全策略
            helmet()(req, res, next);
        } else {
            // 🔓 局域网 HTTP 环境：放宽限制，干掉升级 HTTPS 的强硬指令
            helmet({
                hsts: false,
                contentSecurityPolicy: {
                    directives: {
                        "default-src": ["'self'"],
                        "script-src": ["'self'", "'unsafe-inline'"],
                        "style-src": ["'self'", "'unsafe-inline'"],
                        "img-src": ["'self'", "data:"],
                        "upgrade-insecure-requests": null, // 核心修复
                    },
                },
            })(req, res, next);
        }
    });
}


app.use(compression({ threshold: 1024 }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api', router);


app.get('/health', (_req, res) => {
    res.json({ status: 'OK' });
});


// 开发模式下由 vite.config.server.ts 的 Vite 服务器直接挂载本 app（vite-plugin-node），
// 这里不再自建第二个 HTTP server + Vite，否则会出现“页面在 3000、HMR 在另一个端口”的错位。
if (!isDev) {




    const clientPath = path.resolve("./dist/client");
    // index.html 不缓存，保证发版后刷新即可拿到新资源清单
    const sendIndex = (res: any) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(clientPath, 'index.html'));
    };
    // 默认index.html
    app.get('/', (req, res) => {
        sendIndex(res);
    });
    // 其他路径
    app.get("/{*splat}", (req, res) => {
        const splat: string[] = (<any>req.params).splat || [];
        // 防止 ../ 跳出 dist/client 读取任意文件
        const requested = path.resolve(clientPath, splat.join('/'));
        if (requested !== clientPath && !requested.startsWith(clientPath + path.sep)) {
            return sendIndex(res);
        }
        // 随机组件就添加缓存控制
        if (splat.length > 0 && splat[splat.length - 1].includes('-')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        res.sendFile(requested, (e) => {
            // 如果找不到文件,则返回 index.html
            if (e) sendIndex(res);
        });
    });
    // 这里的 process.env.SERVER_PORT 正好能接住你之前在 PM2 ecosystem 配置里写的 PORT: 4000
    const port = process.env.SERVER_PORT || process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`🚀 后端服务已启动，生产环境监听端口: ${port}`);
    });

}



export { app as viteNodeApp };