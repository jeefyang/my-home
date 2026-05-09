import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export const UserApiUrl = apiUrlsTrans("user/", {

    getUser: {
        method: "GET",
        to: {} as UserType
    },
    userList: {
        method: "GET",
        to: {} as Partial<UserType>[]
    },
    deleteUser: {
        method: "POST",
        from: {} as { uuid: string; }
    },
    overCancelUser: {
        method: "POST",
    },
    createUser: {
        method: "POST",
        from: {} as { type: UserTypeType; },
        to: {} as UserType
    },
    updateUser: {
        method: "POST",
        from: {} as Partial<UserType>,
        to: {} as UserType
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
        from: {} as { newPathID: string; },
        to: {} as UserType
    }
});