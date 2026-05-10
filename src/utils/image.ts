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
