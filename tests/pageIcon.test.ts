import { describe, expect, it } from "vitest";
import { validatePageIcon } from "../server/utils/pageIcon";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M1 1h2" fill="currentColor"></path><circle cx="12" cy="12" r="3" /></svg>';

describe("validatePageIcon", () => {
    it("接受默认页同款 SVG", () => {
        const [value, err] = validatePageIcon(SVG);
        expect(err).toBeUndefined();
        expect(value).toBe(SVG);
    });

    it("接受 emoji 与单字", () => {
        expect(validatePageIcon("🏠")[1]).toBeUndefined();
        expect(validatePageIcon("首")[1]).toBeUndefined();
        expect(validatePageIcon("🇨🇳")[1]).toBeUndefined();
    });

    it("拒绝空值与超长文本", () => {
        expect(validatePageIcon("")[1]).toBeTruthy();
        expect(validatePageIcon("   ")[1]).toBeTruthy();
        expect(validatePageIcon("12345")[1]).toBeTruthy();
        expect(validatePageIcon("🏠🏠🏠🏠🏠")[1]).toBeTruthy();
    });

    it("拒绝文本里的 HTML 字符", () => {
        expect(validatePageIcon("a<b")[1]).toBeTruthy();
        expect(validatePageIcon("a&b")[1]).toBeTruthy();
    });

    it("拒绝事件属性与脚本标签", () => {
        expect(validatePageIcon('<svg onload="alert(1)"></svg>')[1]).toBeTruthy();
        expect(validatePageIcon("<svg><script>alert(1)</script></svg>")[1]).toBeTruthy();
        expect(validatePageIcon('<svg><path d="M0 0" onclick="x"/></svg>')[1]).toBeTruthy();
    });

    it("拒绝外部引用与样式", () => {
        expect(validatePageIcon('<svg><use href="#x"/></svg>')[1]).toBeTruthy();
        expect(validatePageIcon('<svg><use xlink:href="#x"/></svg>')[1]).toBeTruthy();
        expect(validatePageIcon('<svg><image href="x"/></svg>')[1]).toBeTruthy();
        expect(validatePageIcon('<svg><foreignObject></foreignObject></svg>')[1]).toBeTruthy();
        expect(validatePageIcon('<svg style="color:red"></svg>')[1]).toBeTruthy();
    });

    it("拒绝多根与不配对", () => {
        expect(validatePageIcon("<svg></svg><svg></svg>")[1]).toBeTruthy();
        expect(validatePageIcon("<svg><path></svg>")[1]).toBeTruthy();
        expect(validatePageIcon("<svg></svg> ")[0]).toBe("<svg></svg>");
        expect(validatePageIcon("<div></div>")[1]).toBeTruthy();
    });

    it("拒绝注释、文本节点与 DOCTYPE", () => {
        expect(validatePageIcon("<svg><!-- x --></svg>")[1]).toBeTruthy();
        expect(validatePageIcon("<svg>hello</svg>")[1]).toBeTruthy();
        expect(validatePageIcon("<!DOCTYPE svg><svg></svg>")[1]).toBeTruthy();
    });

    it("拒绝超长 SVG 与属性格式垃圾", () => {
        const long = '<svg xmlns="http://www.w3.org/2000/svg"><path d="' + "M0 0".repeat(2000) + '"/></svg>';
        expect(validatePageIcon(long)[1]).toBeTruthy();
        expect(validatePageIcon('<svg xmlns="http://www.w3.org/2000/svg" ??></svg>')[1]).toBeTruthy();
    });

    it("接受自闭合与带属性的 path", () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 12h16"/></svg>';
        expect(validatePageIcon(svg)[1]).toBeUndefined();
    });
});
