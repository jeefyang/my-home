import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export const UserApiUrl = apiUrlsTrans("user/", {
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
    }
});