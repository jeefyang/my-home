
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { ToolsImgApiUrl } from "@common/apis/toolsImg";
import { Router } from "express";
import { verifyUserFromReq } from "../../stores/users";
import { getUrlTitle } from "./url";
import { ToolsUrlApiUrl } from "@common/apis/toolsUrl";


export function useToolsUrlApi(router: Router) {
    const urlRouter = new TransExpressRouter(ToolsUrlApiUrl, router);

    urlRouter.setRouter('titleUrl', async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const data = await getUrlTitle(from.url);
        if (data[1]) {
            return { err: data[1] };
        }
        return { data: data[0] };

    });
}