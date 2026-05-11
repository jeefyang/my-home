export function getExternalFavicon(url: string, platform: "google" | 'favicon' | "duckduckgo") {
    let origin: string = ""
    try {

        const urlObj = new URL(url);
        origin = urlObj.origin;
    } catch (e) {
        origin = url
    }
    if (platform == 'google') {
        return `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;

    }
    else if (platform == 'favicon') {
        return `https://favicon.im/${origin}`
    }
    else if (platform == 'duckduckgo') {
        return `https://icons.duckduckgo.com/ip3/${origin}.ico`;
    }
    return null;
}

export async function urlToBase64(url: string) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        throw new Error('转换失败: ' + error.message);
    }
}


export async function getBase64ByUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // 解决跨域问题
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 转换为 base64
            const base64 = canvas.toDataURL('image/jpeg', 1.0); // 第二个参数为质量 0-1
            resolve(base64);
        };

        img.onerror = (error) => {
            reject(new Error('图片加载失败: ' + error));
        };

        img.src = url;
    });
}