
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { ToolsImgApiUrl } from "@common/apis/toolsImg";
import { Router } from "express";
import { verifyUserFromReq } from "../../stores/users";
import { favicon } from "./img";

export function useToolsImgApi(router: Router) {
    const imgRouter = new TransExpressRouter(ToolsImgApiUrl, router);

    imgRouter.setRouter("favicon", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const data = await favicon(from, req.headers.pathid);
        if (data[1]) {
            return { err: data[1] };
        }
        return { data: data[0] };

    });
}