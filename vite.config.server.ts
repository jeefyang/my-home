import { defineConfig, loadEnv } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';
import { fileURLToPath, URL } from 'node:url';
import { memoryMonitorPlugin } from "./plugins/memoryMonitorPlugin";
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
    return {
        build: {
            outDir: 'dist/server',
        },
        plugins: [
            ...VitePluginNode({
                adapter: 'express',
                appPath: './server/index.ts',
                exportName: 'viteNodeApp',
            }),
            [...(isDev ? [memoryMonitorPlugin()] : [])]
        ],
        server: {
            // 后端进程跑在 3000，对外不可见，只给前端 Proxy 用
            port: Number(process.env.SERVER_PORT || 3000),
            host: '0.0.0.0'
        },
        resolve: {
            alias: {
                "@common": fileURLToPath(new URL('./common', import.meta.url)),
            }
        }
    };
});