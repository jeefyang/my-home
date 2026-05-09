import { type GlobalThemeOverrides } from "naive-ui";

export const defaultThemeOverrides: GlobalThemeOverrides = {
    Card: {
        paddingMedium: "10px 10px 10px"
    }
};

export function initThemeOverrides(theme: GlobalThemeOverrides): GlobalThemeOverrides {
    const newTheme: GlobalThemeOverrides = { ...theme };
    const loopFn = (targetObj: any, copyObj: any) => {
        for (const key in copyObj) {
            // 没有值,直接赋值
            if (targetObj[key] == undefined) {
                targetObj[key] = copyObj[key];
            }
            // 值为非对象(字符串/数值),就跳过不修改
            else if (typeof copyObj[key] != "object") {
                continue;
            }
            loopFn(targetObj[key], copyObj[key]);
        }
    };
    loopFn(newTheme, defaultThemeOverrides);
    return newTheme;
}