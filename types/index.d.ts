

type UserTypeType = "admin" | "user";

type UserType = {
    uuid: string;
    name: string;
    pathID: string;
    pageUUIDList: string[];
    type: UserTypeType;
    createTime: number;
    modifyTime: number;
    option?: any;
};


type PageType = {
    /** 标题 */
    title: string;
    /** 图标 */
    icon?: string;
    /** 是否为第一个默认 */
    isDefault?: boolean;
    uuid: string;
    itemList: ItemType[];
    style: import("vue").StyleValue;
    option?: any;
    createTime: number;
    modifyTime: number;
};

type ItemDisplayType = "btn" | "icon" | 'fullScreen' | "window" | "modal";

type ItemType<T extends any = any> = {
    type: string;
    uuid: string;
    /** 配置数据 */
    option?: T;
    style?: import("vue").StyleValue;
    display: ItemDisplayType;
    createTime: number;
    modifyTime: number;
};


type ItemRouterType<T extends string = string> = {
    /** 类型,唯一的,不能重复 */
    type: T;
    /** 标题 */
    title: string;
    /** 图标 */
    icon?: string;
    /** 组件名 */
    component: string;
    /** 数据文件列表 */
    dataFileList: {
        [x in string]: { ext: string, defaultContent?: string; }
    };
    /** 初始样式 */
    style: import("vue").StyleValue;
};
