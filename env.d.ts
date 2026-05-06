/// <reference types="vite/client" />



type env = {
    /** 数据路径 */
    DATA_DIR: string,
};

declare namespace NodeJS {
    interface ProcessEnv extends env { }

}

interface ImportMetaEnv extends env { }