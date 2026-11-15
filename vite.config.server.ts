import { defineConfig, loadEnv } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import { fileURLToPath, URL } from 'node:url';
import { memoryMonitorPlugin } from "./plugins/memoryMonitorPlugin";
import clientConfig from './vite.config';
import fs from "fs";


const initFileList: { path: string, examplePath: string; }[] = [
    { path: "ecosystem.config.cjs", examplePath: "ecosystem.config.example.cjs" },
    { path: "initPages.js", examplePath: "initPages.example.js" }
];



for (const item of initFileList) {
    if (!fs.existsSync(item.path)) {
        fs.writeFileSync(item.path, fs.readFileSync(item.examplePath));
    }
}

const dirList = ["logs"];

for (let dir of dirList) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

}


export default defineConfig(({ mode }) => {
  
    const isDev = mode === 'development';
    const clientAlias = (clientConfig.resolve?.alias ?? {}) as Record<string, string>;
    return {
        build: {
            outDir: 'dist/server',
        },
        plugins: [
            // 开发模式页面由这个 Vite 服务，必须带上客户端插件
            // （Vue、UnoCSS、Naive UI 自动导入），否则 virtual:uno.css 等解析失败。
            ...(isDev ? (clientConfig.plugins ?? []) : []),
            ...(isDev
                ? [
                    // 开发模式：Vite 自己服务前端页面。Express app 必须拿到 next，
                    // 没匹配到路由时继续走 Vite 的页面/静态资源中间件，
                    // 否则 Express 的 404 会吞掉 / 和所有前端资源请求。
                    {
                        name: 'my-home-dev-node',
                        apply: 'serve',
                        configureServer(server: any) {
                            let appPromise: Promise<any> | null = null;
                            server.middlewares.use(async (req: any, res: any, next: any) => {
                                const mod = await server.ssrLoadModule('./server/index.ts');
                                appPromise ??= Promise.resolve(mod.viteNodeApp);
                                const app = await appPromise;
                                // 传入 next：Express 没匹配到路由时继续走 Vite 的
                                // 页面/静态资源中间件，而不是由 Express 直接 404。
                                app(req, res, next);
                            });
                        }
                    }
                ]
                : VitePluginNode({
                    adapter: 'express',
                    appPath: './server/index.ts',
                    exportName: 'viteNodeApp',
                })),
            [...(isDev ? [memoryMonitorPlugin()] : [])]
        ],
        server: {
            // 后端进程跑在 3000，对外不可见，只给前端 Proxy 用
            port: Number(process.env.SERVER_PORT || 3000),
            host: '0.0.0.0',
            // HMR 和页面共用同一个端口；显式给 host，避免客户端连到 0.0.0.0
            hmr: { host: 'localhost' }
        },
        resolve: {
            alias: {
                ...clientAlias,
                "@common": fileURLToPath(new URL('./common', import.meta.url)),
            }
        }
    };
});