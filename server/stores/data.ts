import fs from 'fs';
import path from 'path';

export const DATA_DIR = process.env.DATA_DIR;

export const UsersFolder = "users";
export const PagesFolder = "pages";
export const toolsFolder = "tools";

export function dataInit() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`创建数据目录:${DATA_DIR}`);
    }

    if (!fs.existsSync(path.join(DATA_DIR, UsersFolder))) {
        fs.mkdirSync(path.join(DATA_DIR, UsersFolder), { recursive: true });
        console.log(`创建用户目录:${path.join(DATA_DIR, UsersFolder)}`);
    }
}



export function getGroupPages(userUUid?: string) {

}


