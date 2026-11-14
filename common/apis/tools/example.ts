import { apiUrlsTrans } from "./apiUrlsTrans";
import { TransExpressRouter } from "./transExpressRouter";
import { TransFetch } from "./transFetch";
import { Router } from "express";


const ExampleApiUrl = apiUrlsTrans("test/", {
    testPost: { method: "POST", from: {} as { text: string; }, to: {} as { testData: string; } },
    testGet: { method: "POST", from: {} as { text: string; }, to: {} as { testData: string; } },
    testFrom: { method: "POST", from: {} as { text: string; } },
    testTo: { method: "POST", to: {} as { data: string; } }
});

/**
 * 用法示例：只在显式调用时执行，避免模块被 import 时就去发请求。
 * 生产代码不要调用它。
 */
export function runExample() {
    const exampleRouter = new TransExpressRouter(ExampleApiUrl, Router());

    exampleRouter.setRouter('testPost', async (from) => {
        return { data: { testData: "123" } };
    });

    const myFetch = new TransFetch(ExampleApiUrl);
    return myFetch.request("testPost", { text: '123' }).then(res => {
        console.log(res);
        return res;
    });
}
