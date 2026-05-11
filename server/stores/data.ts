import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envFile = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envFile });
const localEnvFile = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(localEnvFile)) {
    dotenv.config({ path: localEnvFile, override: true });
}


export const DATA_DIR = process.env.DATA_DIR;

console.log(`数据目录:${DATA_DIR}`);

export const UsersFolder = "users";
export const PagesFolder = "pages";
export const itemsFolder = "items";
export const filesFolder = "files";
export const dataFolder = "data";

export const dataOptions = {
    /** 是否为空用户 */
    isEmptyUser: true
};

export function dataInit() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`创建数据目录:${DATA_DIR}`);
    }

    if (!fs.existsSync(path.join(DATA_DIR, UsersFolder))) {
        fs.mkdirSync(path.join(DATA_DIR, UsersFolder), { recursive: true });
        console.log(`创建用户目录:${path.join(DATA_DIR, UsersFolder)}`);
    }

    const list = fs.readdirSync(path.join(DATA_DIR, UsersFolder));
    dataOptions.isEmptyUser = list.length == 0;
}



