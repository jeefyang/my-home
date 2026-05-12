
/**
 * 项目路由列表
 * key必须与对象的type一致
 */
export const ItemRouterList: { [key: string]: ItemRouterType; } = {
    "www": {
        type: "www",
        title: "www",
        style: {},
        component: "WWWItem",
        desc:"自定义搜索"
    }

};