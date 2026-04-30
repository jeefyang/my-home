import type { Express } from 'express';
import express from 'express';
import cors from 'cors';
import { createServer } from 'vite';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import router from './routes/api';



const app: Express = express();

app.use(cors());
app.use(express.json());
app.use('/api', router);


app.get('/health', (_req, res) => {
    res.json({ status: 'OK' });
});



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    (async () => {
        try {
            // ✅ 1. 创建原生 HTTP 服务器（必须！）
            const httpServer = http.createServer(app);

            // ✅ 2. 启动 Vite，传入 httpServer（Vite 5+ 标准方式）
            const vite = await createServer({
                server: {
                    middlewareMode: true,
                    // 在 Vite 7/8 中，也可以显式指定 hmr.server
                    hmr: {
                        server: httpServer
                    }
                },
                configFile: path.resolve(__dirname, '../vite.config.ts'),
                root: path.resolve(__dirname, '..')
            });

            // ✅ 3. 挂载中间件
            app.use(vite.middlewares);

            // ✅ 4. 监听端口
            const PORT = parseInt(process.env.PORT || '5173');
            httpServer.listen(PORT, () => {
                console.log(`🚀 Dev server running on http://localhost:${PORT}`);
            });
        } catch (error) {
            console.error('❌ Server startup failed:', error);
            process.exit(1);
        }
    })();
}
else {

    app.use(helmet());

    const clientPath = path.resolve("./dist/client");
    // 默认index.html
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientPath, 'index.html'));
    });
    // 其他路径
    app.get("/{*splat}", (req, res) => {
        const splat: string[] = (<any>req.params).splat;
        res.sendFile(path.join(clientPath, splat.join('/')), (e) => {
            // 如果找不到文件,则返回 index.html
            e && res.sendFile(path.join(clientPath, 'index.html'));
        });
    });
    // 这里的 process.env.SERVER_PORT 正好能接住你之前在 PM2 ecosystem 配置里写的 PORT: 4000
    const port = process.env.SERVER_PORT || 3000;

    app.listen(port, () => {
        console.log(`🚀 后端服务已启动，生产环境监听端口: ${port}`);
    });

}



export { app as viteNodeApp };