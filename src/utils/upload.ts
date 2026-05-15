import { nanoid } from "nanoid";

/** 纯文本转 File */
export function textToFile(content: string, filename?: string, mimeType = 'text/plain') {
    filename = filename || nanoid(16) + ".txt";
    return new File([content], filename, { type: mimeType });
}

/** base64 转 File */
export function base64ToFile(base64: string, filename?: string) {
    // 提取 MIME 类型和纯 base64 数据
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);

    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    filename = filename || nanoid(16) + `.${mime.split('/')[1].trim()}`;
    return new File([u8arr], filename, { type: mime });
}

export type MyUploadFileType = {
    data: File | string, type: "string" | "file" | "base64", filename?: string;
};

export type MyUploadResultType = [{ code: number, msg?: string, data: any; } | undefined, any];

export type MyUploadOptions = {

    url: string, other?: { headers?: Record<string, string>; };
};

export async function myUpload(myFile: MyUploadFileType, o: MyUploadOptions
): Promise<MyUploadResultType> {

    const formData = new FormData();
    let filename = "";
    let file: File | undefined = undefined;
    if (myFile.type == "file") {
        file = myFile.data as File;
        filename = file.name;
    }
    else if (myFile.type == "string") {
        filename = myFile.filename;
        file = textToFile(myFile.data as string, filename);
    }
    else if (myFile.type == "base64") {
        filename = myFile.filename;
        file = base64ToFile(myFile.data as string, filename);
    }
    formData.append('file', file);
    try {
        const res = await fetch(o.url, { method: "POST", headers: o.other?.headers, body: formData });
        if (!res.ok) {
            return [undefined, "上传失败"];
        }
        const data: any = await res.json();
        return [data, undefined];
    }
    catch (err) {
        return [undefined, err];
    }
}

export async function myUploads(myFileList: MyUploadFileType[], o: MyUploadOptions, cb: (f: MyUploadFileType, res: MyUploadResultType, index: number) => void, max: number = 10): Promise<MyUploadResultType[]> {
    const returnList: MyUploadResultType[] = [];
    /** 并发数 */
    let lineCount = 0;
    let curIndex = 0;
    return new Promise((resolve, reject) => {
        const workFn = async () => {
            const myFile = myFileList[curIndex];
            // 已经循环所有数组了
            if (!myFile) {
                // 线程数减1
                lineCount--;
                // 其他线程还未结束,等待退出
                if (lineCount != 0) {
                    return;
                }
                // 已经没有线程在工作,结束
                resolve(returnList);
                return;
            }
            const index = curIndex;
            const res = await myUpload(myFile, o);
            cb(myFile, res, index);
            returnList[index] = res;
            // 继续循环
            curIndex++;
            workFn();
        };

        for (let i = 0; i < max; i++) {
            const myFile = myFileList[i];
            if (!myFile) {
                break;
            }
            workFn();
            curIndex++;
            lineCount++;
        }
    });


};
/** 最大运行的线程 */
export const myUploadLoopMaxLine = 10;

let cacheMyUploadList: {
    uuid: string, data: {
        myFile: MyUploadFileType; o: MyUploadOptions;
    }, resolve: (value: MyUploadResultType) => void;
    reject: (reason?: any) => void;
}[] = [];
/** 当前运行的线程 */
let curLoopLine = 0;
export async function myUploadLoop(myFile: MyUploadFileType, o: MyUploadOptions, maxLine?: number): Promise<MyUploadResultType> {

    if (!maxLine) {
        maxLine = myUploadLoopMaxLine;
    }

    const workFn = async () => {
        // 缓存已经没有等待上传数据,关闭线程退出
        if (cacheMyUploadList.length == 0) {
            curLoopLine--;
            return;
        }
        // 缓存有等待上传数据,继续上传,线程继续工作
        const item = cacheMyUploadList.shift()!;
        try {
            const res = await myUpload(item.data.myFile, item.data.o);
            item.resolve(res);
        }
        catch (err) {
            item.reject(err);
        }
        workFn();
        return;
    };
    return new Promise(async (resolve, reject) => {
        // 线程数已经达到最大,缓存数据,等待线程空闲
        if (curLoopLine >= myUploadLoopMaxLine) {
            cacheMyUploadList.push({ uuid: nanoid(16), data: { myFile, o }, resolve, reject });
            return;
        }
        // 还有线程可用,占用新的线程
        curLoopLine++;
        const res = await myUpload(myFile, o);
        resolve(res);
        // 当前上传工作完成,继续查看缓存是否有数据需要继续上传
        workFn();

    });
}