import { apiUrlsTrans } from "./tools/apiUrlsTrans";

type UserPublicPatch = Pick<UserType, "customData" | "style" | "options">;

export const UserApiUrl = apiUrlsTrans("user/", {

    getUser: {
        method: "GET",
        to: {} as UserType
    },
    userList: {
        method: "GET",
        to: {} as AdminUserItem[]
    },
    deleteUser: {
        method: "POST",
        from: {} as { uuid: string; },
        to: {} as { deleted: true; warnings?: string[]; }
    },
    createUser: {
        method: "POST",
        from: {} as { type: UserTypeType; name?: string; pathID?: string; secondCode?: string; },
        to: {} as { user: AdminUserItem; secondCode?: string; }
    },
    adminUpdateUser: {
        method: "POST",
        from: {} as { uuid: string; name?: string; type?: UserTypeType; },
        to: {} as AdminUserItem
    },
    adminResetUserSecondCode: {
        method: "POST",
        from: {} as { uuid: string; secondCode?: string; },
        to: {} as { user: AdminUserItem; secondCode?: string; cleared: boolean; }
    },
    updateUser: {
        method: "POST",
        from: {} as Partial<UserPublicPatch>,
        to: {} as AdminUserItem
    },
    verifyUser: {
        method: "POST",
        to: {} as UserType
    },
    getUserData: {
        method: "POST",
        from: {} as { filename: string; },
        to: {} as string
    },
    updateUserData: {
        method: "POST",
        from: {} as { filename: string, content: string; },
        to: {} as string
    },
    clearUserData: {
        method: "POST",
    },
    deleteUserData: {
        method: "POST",
        from: {} as { filename: string; },
    },
    editUserPathID: {
        method: "POST",
        from: {} as { newPathID?: string; newSecondCode?: string; },
        to: {} as UserType
    }
});
