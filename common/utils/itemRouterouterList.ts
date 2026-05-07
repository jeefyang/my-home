
/**
 * 项目路由列表
 * key必须与对象的type一致
 */
export const ItemRouterList: { [key: string]: ItemRouterType; } = {
    "search": {
        type: "search",
        title: "搜索",
        style: {},
        component: "SearchItem",
        dataFileList: {}
    }

};