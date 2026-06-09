
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
        icon: "icon.png",
        desc: "自定义搜索"
    },
    'bookmark': {
        type: "bookmark",
        title: "收藏夹",
        component: "BookmarkItem",
        style: {},
        icon: "icon.png",
        desc: "书签"
    },
    'memo': {
        type: "memo",
        title: "备忘录",
        component: "MemoItem",
        style: {},
        icon: "icon.png",
        desc: "记事"
    },
    'dockerConvert': {
        type: "dockerConvert",
        title: "docker转换",
        component: "DockerConvertItem",
        style: {},
        icon: "icon.png",
        desc: "docker run → docker-compose"
    }
};