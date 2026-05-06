

type UserTypeType = "admin" | "user";

type UserType = {
    uuid: string;
    name: string;
    pathID: string;
    pageUUIDList: string[];
    type: UserTypeType;
    createTime: number;
    modifyTime: number;
};


type PageType = {
    /** 标题 */
    title: string;
    uuid: string;
    itemList: ItemType[];
    style: import("vue").StyleValue;
    createTime: number;
    modifyTime: number;
};

type ItemType<T extends any = any> = {
    type: string;
    uuid: string;
    option: T;
    style: import("vue").StyleValue;
};