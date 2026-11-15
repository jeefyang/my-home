/** 顺序更新的集合校验：长度、去重、成员都必须与当前列表一致 */
export function isValidPageOrder(current: string[], next: unknown): next is string[] {
    if (!Array.isArray(next)) {
        return false;
    }
    if (next.length !== current.length) {
        return false;
    }
    const set = new Set(next);
    if (set.size !== next.length) {
        return false;
    }
    return next.every(uuid => typeof uuid === "string" && current.includes(uuid));
}
