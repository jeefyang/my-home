export class UrlUtils {
    static checkImgUrl(url: string, prefix: string) {
        const noPrefixList = ['data:', "https://", "http://"];
        for (let i = 0; i < noPrefixList.length; i++) {
            const prefix = noPrefixList[i];
            if (prefix && url.startsWith(prefix)) {
                return url;
            }
        }
        if (url.startsWith('/')) {
            return prefix + url;
        }
        return prefix + '/' + url;
    }
}