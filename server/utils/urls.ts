export class UrlsUtils {

    // 检测单路径是否违法
    static checkSinglePath(...paths: string[]) {
        for (let i = 0; i < paths.length; i++) {
            const p = paths[i];
            if (!p || p.length == 0 || p == '.') {
                return false
            }
            if (p.includes('/') || p.includes('\\') || p.includes("..")) {
                return false
            }
        }
        return true
    }
}