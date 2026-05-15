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
/** files文件夹的文件一般用随机数存储(如图片等,一般用随机数命名,要么存在,要么删除,一般不做二次修改的),要做缓存,建议不要存实时变化数据 */
export const filesFolder = "files";
/** data文件夹的文件数据是实时变化,一般存字符串(或者json字符串),不做缓存,要有实时性 */
export const dataFolder = "data";

export const isDev = process.env.NODE_ENV === 'development';

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



