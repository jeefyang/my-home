
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
    },
    'quickAccess': {
        type: "quickAccess",
        title: "快捷访问",
        component: "QuickAccessItem",
        style: {},
        icon: "icon.png",
        desc: "快捷网址访问"
    },
    'magnet': {
        type: "magnet",
        title: "磁力补全",
        component: "MagnetItem",
        style: {},
        icon: "icon.png",
        desc: "磁力链接补全"
    },
    'crypto': {
        type: "crypto",
        title: "暗号",
        component: "CryptoItem",
        style: {},
        icon: "icon.png",
        desc: "加密解密工具"
    },
    'pathConvert': {
        type: "pathConvert",
        title: "路径转换",
        component: "PathConvertItem",
        style: {},
        icon: "icon.png",
        desc: "路径符号互转"
    }
};
