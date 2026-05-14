export type BookmarkType = {
    title: string;
    uuid: string;
    sortid: number;
    creatTime: number;
    modifyTime: number;
    isDefault?: boolean;
};

export type BookmarkCollectionType = {
    children: BookmarkCollectionType[];
    creatTime: number;
    modifyTime: number;
    url: string;
    title: string;
    icon?: string;
    isFolder?: boolean;
    uuid: string;
};