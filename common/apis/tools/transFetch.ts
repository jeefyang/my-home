import type { apiUrlsTrans, ResSendType } from "./apiUrlsTrans";

type EventType = "afterFetch";
// 1. 提取事件处理函数的类型
type EventListener<T extends ReturnType<typeof apiUrlsTrans>> = <K extends keyof T>(
    key: K,
    res?: ResSendType<T[K]["to"]>
) => Promise<any>;

export class TransFetch<T extends ReturnType<typeof apiUrlsTrans>> {

    constructor(public transObj: T, public prevUrl: string = '') {

    }

    protected eventList: {
        [x in EventType]?
        : EventListener<T>[]
    } = {};

    addListener(type: EventType, fn: EventListener<T>
    ) {
        if (!this.eventList[type]) {
            this.eventList[type] = [];
        }
        this.eventList[type]!.push(fn);
    }

    removeListener(type: EventType, fn: EventListener<T>
    ) {
        if (!this.eventList[type]) {
            return;
        }
        const index = this.eventList[type]!.indexOf(fn);
        if (index > -1) {
            this.eventList[type]!.splice(index, 1);
        }
    }

    getHeaderFn: <K extends keyof T>(key: K) => Promise<Record<string, string> | undefined> = async () => undefined;

    getErrFn: <K extends keyof T>(key: K, err: any) => Promise<ResSendType<T[K]["to"]>> = async (key, err) => {
        return {
            code: 666,
            msg: "请求失败",
            err: err
        };
    };

    /** 单次请求超时时间(ms) */
    timeout: number = 15000;

    /** 请求 */
    async request<K extends keyof T>(key: K, data?: T[K]["from"]): Promise<ResSendType<T[K]["to"]>> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        try {
            const item = this.transObj[key];
            if (!item) {
                //@ts-expect-error
                throw new Error(`${key} not found`);
            }
            let url = this.prevUrl + item.url;
            if (item.method == "GET" && data) {
                // data as any 防止严格模式报错
                url += "?" + new URLSearchParams(data as any).toString();
            }
            const headers = await this.getHeaderFn(key);
            const response = await fetch(url, {
                method: item.method,
                body: item.method == "POST" ? JSON.stringify(data) : undefined,
                headers: headers,
                signal: controller.signal
            });
            const text = await response.text();
            let res: any;
            try {
                res = text ? JSON.parse(text) : {};
            } catch (err) {
                return {
                    code: 666,
                    msg: `接口返回了非 JSON 数据(${response.status})`,
                    err: text.slice(0, 200)
                } as ResSendType<T[K]["to"]>;
            }
            if (response.status == 401) {
                return { code: 401, msg: res?.msg || "登录已失效", err: res?.err } as ResSendType<T[K]["to"]>;
            }
            if (!response.ok) {
                return {
                    code: res?.code || response.status,
                    msg: res?.msg || `请求失败(${response.status})`,
                    err: res?.err
                } as ResSendType<T[K]["to"]>;
            }
            if (this.eventList["afterFetch"]) {
                for (const fn of this.eventList["afterFetch"]!) {
                    if (await fn(key, res)) {
                        break;
                    }
                }
            }
            return res;
        }
        catch (err: any) {
            const aborted = err?.name == "AbortError";
            return {
                code: 666,
                msg: aborted ? "请求超时" : "请求失败",
                err
            } as ResSendType<T[K]["to"]>;
        }
        finally {
            clearTimeout(timer);
        }
    }

}