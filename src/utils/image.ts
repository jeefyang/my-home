export function getExternalFavicon(url: string, platform: "google" | 'favicon' | "duckduckgo") {
    try {
        const urlObj = new URL(url);
        const origin = urlObj.origin;
        if(platform=='google'){
        return `https://www.google.com/s2/favicons?domain=${origin}&sz=64`;
            
        }
        else if(platform=='favicon'){
            return `https://favicon.ico/${origin}`
        }
        else if(platform=='duckduckgo'){
            return `https://icons.duckduckgo.com/ip3/${origin}.ico`;
        }
        return null;
       
        
    } catch (e) {
        return null;
    }
}
