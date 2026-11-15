// 生成 src/assets/page-icons.json：构建期把 @vicons 组件渲染成 SVG 字符串
// 运行：node scripts/gen-page-icons.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = ["tabler", "carbon", "material", "fluent", "ionicons4", "ionicons5"];

/** 语义 → 每个图标包的首选组件名；缺失时回退到关键词搜索 */
const CURATED = {
    tabler: {
        home: "Home", settings: "Settings", search: "Search", star: "Star", heart: "Heart",
        bookmark: "Bookmark", folder: "Folder", file: "File", user: "User", bell: "Bell",
        camera: "Camera", calendar: "Calendar", cloud: "Cloud", download: "Download",
        upload: "Upload", globe: "World", link: "Link", lock: "Lock", mail: "Mail",
        image: "Photo", video: "Video", trash: "Trash", edit: "Edit", add: "Plus"
    },
    carbon: {
        home: "Home", settings: "Settings", search: "Search", star: "Star", heart: "Favorite",
        bookmark: "Bookmark", folder: "Folder", file: "Document", user: "User", bell: "Notification",
        camera: "Camera", calendar: "Calendar", cloud: "Cloud", download: "Download",
        upload: "Upload", globe: "Globe", link: "Link", lock: "Locked", mail: "Email",
        image: "Image", video: "Video", trash: "TrashCan", edit: "Edit", add: "Add"
    },
    material: {
        home: "HomeOutlined", settings: "SettingsOutlined", search: "SearchOutlined", star: "StarOutlined",
        heart: "FavoriteOutlined", bookmark: "BookmarkOutlined", folder: "FolderOutlined", file: "DescriptionOutlined",
        user: "PersonOutlined", bell: "NotificationsOutlined", camera: "CameraAltOutlined",
        calendar: "CalendarTodayOutlined", cloud: "CloudOutlined", download: "DownloadOutlined",
        upload: "UploadOutlined", globe: "PublicOutlined", link: "LinkOutlined", lock: "LockOutlined",
        mail: "MailOutlined", image: "ImageOutlined", video: "VideocamOutlined", trash: "DeleteOutlined",
        edit: "EditOutlined", add: "AddOutlined"
    },
    fluent: {
        home: "Home20Regular", settings: "Settings20Regular", search: "Search20Regular", star: "Star20Regular",
        heart: "Heart20Regular", bookmark: "Bookmark20Regular", folder: "Folder20Regular", file: "Document20Regular",
        user: "Person20Regular", bell: "Alert20Regular", camera: "Camera20Regular", calendar: "CalendarLtr20Regular",
        cloud: "Cloud20Regular", download: "ArrowDownload20Regular", upload: "ArrowUpload20Regular",
        globe: "Globe20Regular", link: "Link20Regular", lock: "LockClosed20Regular", mail: "Mail20Regular",
        image: "Image20Regular", video: "Video20Regular", trash: "Delete20Regular", edit: "Edit20Regular",
        add: "Add20Regular"
    },
    ionicons4: {
        home: "MdHome", settings: "MdSettings", search: "MdSearch", star: "MdStar", heart: "MdHeart",
        bookmark: "MdBookmark", folder: "MdFolder", file: "MdDocument", user: "MdPerson",
        bell: "MdNotifications", camera: "MdCamera", calendar: "MdCalendar", cloud: "MdCloud",
        download: "MdDownload", upload: "MdCloudUpload", globe: "MdGlobe", link: "MdLink",
        lock: "MdLock", mail: "MdMail", image: "MdImage", video: "MdVideocam", trash: "MdTrash",
        edit: "MdCreate", add: "MdAdd"
    },
    ionicons5: {
        home: "Home", settings: "Settings", search: "Search", star: "Star", heart: "Heart",
        bookmark: "Bookmark", folder: "Folder", file: "Document", user: "Person", bell: "Notifications",
        camera: "Camera", calendar: "Calendar", cloud: "Cloud", download: "Download",
        upload: "CloudUpload", globe: "Globe", link: "Link", lock: "LockClosed", mail: "Mail",
        image: "Image", video: "Videocam", trash: "Trash", edit: "Pencil", add: "Add"
    }
};

/** 首选名缺失时的关键词回退 */
const FALLBACK_TOKENS = {
    home: ["home"], settings: ["settings"], search: ["search"], star: ["star"], heart: ["heart", "favorite"],
    bookmark: ["bookmark"], folder: ["folder"], file: ["file", "document"], user: ["user", "person"],
    bell: ["bell", "notification"], camera: ["camera"], calendar: ["calendar"], cloud: ["cloud"],
    download: ["download"], upload: ["upload"], globe: ["globe", "world", "public"], link: ["link"],
    lock: ["lock"], mail: ["mail", "email"], image: ["image", "photo", "picture"],
    video: ["video", "videocam"], trash: ["trash", "delete"], edit: ["edit", "pencil", "create"],
    add: ["add", "plus"]
};

function listNames(pkg) {
    const dir = path.join(root, "node_modules", "@vicons", pkg, "es");
    return fs.readdirSync(dir)
        .filter(file => file.endsWith(".js") && file !== "index.js")
        .map(file => file.slice(0, -3));
}

function has(pkg, name) {
    return fs.existsSync(path.join(root, "node_modules", "@vicons", pkg, "es", name + ".js"));
}

function fallbackPick(names, tokens, used) {
    for (const token of tokens) {
        const matches = names
            .filter(name => !used.has(name) && name.toLowerCase().includes(token))
            .sort((a, b) => a.length - b.length || a.localeCompare(b));
        if (matches.length) return matches[0];
    }
    return null;
}

function normalize(svg) {
    let out = svg
        .replace(/<!--\[-->|<!--\]-->/g, "")
        .replace(/\s+xmlns:xlink="[^"]*"/g, "")
        // ionicons4 会带 SVG 1.1 的 version / enable-background / xml:space，白名单不需要
        .replace(/\s+version="[^"]*"/g, "")
        .replace(/\s+enable-background="[^"]*"/g, "")
        .replace(/\s+xml:space="[^"]*"/g, "")
        .trim();
    out = out.replace(/^<svg([^>]*)>/, (match, attrs) => {
        let next = attrs;
        if (!/xmlns=/.test(next)) next = ' xmlns="http://www.w3.org/2000/svg"' + next;
        if (!/aria-hidden=/.test(next)) next += ' aria-hidden="true"';
        if (!/focusable=/.test(next)) next += ' focusable="false"';
        return `<svg${next}>`;
    });
    return out;
}

async function render(pkg, name) {
    const file = path.join(root, "node_modules", "@vicons", pkg, "es", name + ".js");
    const mod = await import(pathToFileURL(file).href);
    const component = mod.default && mod.default.default ? mod.default.default : mod.default;
    const app = createSSRApp({ render: () => h(component) });
    return normalize(await renderToString(app));
}

const output = {};
let total = 0;
for (const pkg of PACKAGES) {
    const names = listNames(pkg);
    const used = new Set();
    for (const [semantic, preferred] of Object.entries(CURATED[pkg])) {
        let chosen = has(pkg, preferred) && !used.has(preferred) ? preferred : null;
        if (!chosen) chosen = fallbackPick(names, FALLBACK_TOKENS[semantic] || [semantic], used);
        if (!chosen) {
            console.warn(`跳过 ${pkg}/${semantic}：包内没有匹配图标`);
            continue;
        }
        used.add(chosen);
        output[`${pkg}/${chosen}`] = {
            from: `${pkg}/${semantic}`,
            svg: await render(pkg, chosen)
        };
        total += 1;
    }
}

const outFile = path.join(root, "src/assets/page-icons.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n");
console.log(`写入 ${outFile}：${total} 个图标，${(fs.statSync(outFile).size / 1024).toFixed(1)} KB`);
