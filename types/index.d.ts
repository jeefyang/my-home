

type UserTypeType = "admin" | "user";

type MyStyleType = import("vue").CSSProperties;

type UserOptionType = {

};

type UserType = {
    uuid: string;
    name: string;
    pathID: string;
    pageUUIDList: string[];
    type: UserTypeType;
    createTime: number;
    modifyTime: number;
    /** 一般存放可以快速重置的数据(直接清空) */
    option?: Partial<UserOptionType>;
    /** 自定义数据,可用于跨页面跨项目交互,请谨慎使用 */
    customData?: Record<string, any>;
    style?: MyStyleType;
    password?: string;
};

type ItemDisplayType = "btn" | "icon" | 'fullPage' | "box" | "widthBox";

type ItemGroupOptionType = {
};


type ItemGroupType = {
    display: ItemDisplayType;
    list: ItemType[];
    style?: MyStyleType;
    /** 一般存放可以快速重置的数据(直接清空) */
    option?: Partial<ItemGroupOptionType>;
    uuid?: string;
    title?: string;
    /** 自定义数据,可用于跨页面跨项目交互,请谨慎使用 */
    customData?: Record<string, any>;
};

type PageOptionType = {

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
    style: MyStyleType;
    /** 一般存放可以快速重置的数据(直接清空) */
    option?: Partial<PageOptionType>;
    /** 自定义数据,可用于跨页面跨项目交互,请谨慎使用 */
    customData?: Record<string, any>;
    createTime: number;
    modifyTime: number;
};



type ItemType = {
    type: string;
    uuid?: string;
    /** 一般存放可以快速重置的数据(直接清空) */
    option?: Partial<ItemOptionType>;
    /** 自定义数据,可用于跨页面跨项目交互,请谨慎使用 */
    customData?: Record<string, any>;
    style?: MyStyleType;
    createTime?: number;
    modifyTime?: number;
};

type ItemOptionType = {
    /** 标题,会覆盖原始标题 */
    title: string;
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
    /** 初始样式 */
    style: MyStyleType;
    /** 是否隐藏,用于调试和一些高级功能暂时不想显示 */
    isHide?: boolean;
    desc?: string;
};
