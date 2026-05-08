import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export const ItemApiUrl = apiUrlsTrans("item/", {

    // getItem: { method: "GET", from: {} as { uuid: string; }, to: {} as ItemType },
    addItem: { method: "POST", from: {} as { insertIndex?: number, pageUUID: string, itemGroupUUID: string; obj: Partial<ItemType>; }, to: {} as ItemType },
    updateItem: { method: "POST", from: {} as { pageUUID: string; obj: Partial<ItemType>; }, to: {} as ItemType },
    deleteItem: { method: "POST", from: {} as { pageUUID: string; uuid: string; } },
    addItemGroup: { method: "POST", from: {} as { insertIndex?: number, pageUUID: string, obj: Partial<ItemGroupType>; }, to: {} as ItemGroupType },
    updateItemGroup: { method: "POST", from: {} as { pageUUID: string; obj: Partial<ItemGroupType>; }, to: {} as ItemGroupType },
    deleteItemGroup: { method: "POST", from: {} as { pageUUID: string; uuid: string; }, to: {} as ItemGroupType[] },
    getItemData: {
        method: "GET",
        from: {} as { itemType: string, itemUUID: string, dataName: string; }, to: {} as string
    },
    updateItemData: {
        method: "POST",
        from: {} as { itemType: string, itemUUID: string, dataName: string, data: string; }
    },
    clearItemData: {
        method: "POST",
        from: {} as { itemType: string, itemUUID: string, dataName: string; }
    }

});