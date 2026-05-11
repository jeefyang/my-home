/// <reference types="vite/client" />



type env = {
    /** 数据路径 */
    DATA_DIR: string,
    /** 监听端口 */
    SERVER_PORT:number
};

declare namespace NodeJS {
    interface ProcessEnv extends env { }

}

interface ImportMetaEnv extends env { }