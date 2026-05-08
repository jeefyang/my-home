// types/express.d.ts
import 'express';

declare module 'express' {

    // 扩展 headers 类型
    interface Request {
        headers: {
            pathid: string;
            password?: string;
        };
    }
}