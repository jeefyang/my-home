import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

/** 目标项是否完整落在可视区内（与 DOM 解耦，便于单测） */
export function isFullyVisible(left: number, right: number, viewLeft: number, viewRight: number): boolean {
    return left >= viewLeft && right <= viewRight;
}

/** 把目标项居中所需的 scrollLeft */
export function centeredScrollLeft(left: number, itemWidth: number, clientWidth: number): number {
    return left - (clientWidth - itemWidth) / 2;
}

/**
 * 底部导航的横向滚动状态：
 * - canLeft / canRight 控制两侧 16px 渐隐；
 * - scrollTo 把选中项滚进可视区（已完全可见时不滚），供首屏、切换、resize 使用。
 */
export function useNavScroll(count: Ref<number>, activeUUID: Ref<string | undefined>) {
    const scrollRef = ref<HTMLElement | null>(null);
    const canLeft = ref(false);
    const canRight = ref(false);
    let frame = 0;

    const measure = () => {
        const el = scrollRef.value;
        if (!el) {
            canLeft.value = false;
            canRight.value = false;
            return;
        }
        canLeft.value = el.scrollLeft > 1;
        canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    };

    const update = () => {
        if (frame) {
            return;
        }
        frame = requestAnimationFrame(() => {
            frame = 0;
            measure();
        });
    };

    const scrollTo = (uuid?: string, behavior: ScrollBehavior = "smooth") => {
        if (!uuid) {
            return;
        }
        const el = scrollRef.value;
        if (!el) {
            return;
        }
        const target = Array.from(el.querySelectorAll<HTMLElement>("[data-page-uuid]")).find(
            (item) => item.dataset.pageUuid === uuid
        );
        if (!target) {
            return;
        }
        const left = target.offsetLeft;
        const right = left + target.offsetWidth;
        const viewLeft = el.scrollLeft;
        const viewRight = viewLeft + el.clientWidth;
        // 已经完整可见就不打扰用户
        if (isFullyVisible(left, right, viewLeft, viewRight)) {
            return;
        }
        el.scrollTo({ left: centeredScrollLeft(left, target.offsetWidth, el.clientWidth), behavior });
    };

    const onResize = () => {
        update();
        scrollTo(activeUUID.value, "auto");
    };

    onMounted(() => {
        scrollRef.value?.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", onResize);
        update();
        nextTick(() => scrollTo(activeUUID.value, "auto"));
    });

    onBeforeUnmount(() => {
        scrollRef.value?.removeEventListener("scroll", update);
        window.removeEventListener("resize", onResize);
        if (frame) {
            cancelAnimationFrame(frame);
        }
    });

    watch(
        () => count.value,
        () => {
            update();
            nextTick(() => scrollTo(activeUUID.value));
        },
        { flush: "post" }
    );

    watch(
        () => activeUUID.value,
        (uuid) => {
            scrollTo(uuid);
        },
        { flush: "post" }
    );

    return { scrollRef, canLeft, canRight, update, scrollTo };
}
