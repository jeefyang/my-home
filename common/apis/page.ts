import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export const PageApiUrl = apiUrlsTrans("page/", {
    initPages: {
        method: "POST", to: {} as PageType[]
    },
    getPage: { method: "GET", from: {} as { uuid: string; }, to: {} as PageType },
    getPageList: {
        method: "POST",
        from: {} as { uuidList: string[]; },
        to: {} as PageType[]
    },
    deletePage: { method: "POST", from: {} as { uuid: string; }, to: {} as { uuidList: string[]; } },
    updatePageOrder: { method: "POST", from: {} as { uuidList: string[]; }, to: {} as { uuidList: string[]; } },
    updatePage: { method: "POST", from: {} as { uuid: string; obj: Partial<PageType>; }, to: {} as PageType },
    addPage: {
        method: "POST",
        from: {} as { title?: string; icon?: string; },
        to: {} as { page: PageType; uuidList: string[]; }
    },
    getPageData: {
        method: "POST", from: {} as { pageUUID: string, filename: string; }
        , to: {} as string
    },
    updatePageData: { method: "POST", from: {} as { pageUUID: string, filename: string, content: string; } },
    clearPageData: { method: "POST", from: {} as { pageUUID: string; } },
    deletePageData: { method: "POST", from: {} as { pageUUID: string, filename: string; } },
});
