import { useMessage } from "naive-ui";

export class Utils {
    static async copyStr(msg: ReturnType<typeof useMessage>, str: string, obj?: {
        successMsg?: string;
        errorMsg?: string;
        emptyMsg?: string;
    }) {

        if (!str) {
            msg.warning(obj?.emptyMsg || "没有内容可复制");
            return;
        }

        // 1. 尝试使用现代 API
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(str);
                msg.success(obj?.successMsg || "已复制");
                return;
            }
            throw new Error("Clipboard API 不可用，触发降级");
        } catch (e) {
            // 2. 降级方案
            let ta = null;
            try {
                ta = document.createElement("textarea");
                ta.value = str;
                // 优化样式，确保彻底不可见且不影响布局
                ta.style.cssText = "position:fixed;left:-9999px;top:0;width:10px;height:10px;opacity:0;";

                // 【关键修改】：不要挂在 body 上，挂在当前拥有焦点的元素的父级上（通常是点击的那个按钮所在的容器）
                // 如果获取不到，就挂载到弹窗内部的任意一个已知 ID 的 div 上
                const container = document.activeElement ? document.activeElement.parentNode : document.body;
                container.appendChild(ta);

                ta.focus();
                ta.select();

                if (document.execCommand("copy")) {
                    msg.success(obj?.successMsg || "已降级复制");
                } else {
                    if (obj?.errorMsg) {
                        msg.error(obj?.errorMsg);
                    }
                    else {
                        window.prompt("复制失败，请手动复制：", str);

                    }
                }
            } catch (err) {
                console.warn(err);
                if (obj?.errorMsg) {
                    msg.error(obj?.errorMsg);
                }
                else {
                    window.prompt("复制出错，请手动复制：", str);
                }
            } finally {
                // 【关键】：不管成功失败，一定要把临时元素删掉，否则会越堆越多
                if (ta && ta.parentNode) {
                    ta.parentNode.removeChild(ta);
                }
            }
        }
    };
}