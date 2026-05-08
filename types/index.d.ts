

type UserTypeType = "admin" | "user";

type UserType = {
    uuid: string;
    name: string;
    pathID: string;
    pageUUIDList: string[];
    type: UserTypeType;
    createTime: number;
    modifyTime: number;
    /** 一般存放可以快速重置的数据(直接清空) */
    option?: any;
    password?: string;
};

type ItemDisplayType = "btn" | "icon" | 'fullScreen' | "window" | "modal";

type ItemGroupType = {
    display: ItemDisplayType;
    list: ItemType[];
    style?: import("vue").StyleValue;
    /** 一般存放可以快速重置的数据(直接清空) */
    option?: any;
    uuid: string;
    title?: string;
};

type PageType = {
    /** 标题 */
    title: string;
    /** 图标 */
    icon?: string;
    /** 是否为第一个默认 */
    isDefault?: boolean;
    uuid: string;
    itemGroupList: ItemGroupType[];
    style: import("vue").StyleValue;
     /** 一般存放可以快速重置的数据(直接清空) */
    option?: any;
    createTime: number;
    modifyTime: number;
};



type ItemType<T extends any = any> = {
    type: string;
    uuid: string;
     /** 一般存放可以快速重置的数据(直接清空) */
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
