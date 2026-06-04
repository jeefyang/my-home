import type { Directive, DirectiveBinding } from 'vue';

export const vTouch: Directive = {
    mounted(el: HTMLElement, binding: DirectiveBinding) {
        // 期望传入的对象格式: v-touch="{ click: onClick, longpress: onLongPress }"
        const handlers = binding.value || {};

        let pressTimer: ReturnType<typeof setTimeout> | null = null;
        let isLongPress = false;
        let startX = 0;
        let startY = 0;

        // 清理定时器
        const clearTimer = () => {
            if (pressTimer !== null) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        const onTouchStart = (e: TouchEvent | MouseEvent) => {
            if (e instanceof TouchEvent && e.touches.length > 1) return; // 忽略多指

            const touch = e instanceof TouchEvent ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            isLongPress = false;

            clearTimer();

            pressTimer = setTimeout(() => {
                isLongPress = true;
                // 触发长按回调
                if (typeof handlers.longpress === 'function') {
                    if (navigator.vibrate) navigator.vibrate(50); // 可选震动反馈
                    handlers.longpress(e);
                }
            }, 600); // 600ms 判定为长按
        };

        const onTouchMove = (e: TouchEvent | MouseEvent) => {
            const touch = e instanceof TouchEvent ? e.touches[0] : e;
            const moveX = touch.clientX;
            const moveY = touch.clientY;

            // 如果手指移动超过 10px，说明用户在滑动/滚动，取消所有判定
            if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
                clearTimer();
            }
        };

        const onTouchEnd = (e: TouchEvent | MouseEvent) => {
            // 如果定时器还在，说明没到 600ms 就抬手了，判定为点击
            if (pressTimer !== null) {
                clearTimer();
                if (typeof handlers.click === 'function') {
                    handlers.click(e);
                }
            }
        };

        const onTouchCancel = () => {
            clearTimer();
        };

        // 拦截原生右键菜单
        const preventContext = (e: Event) => {
            e.preventDefault();
        };

        // 【关键】拦截长按后系统派发的原生 click 事件
        const stopClickEvent = (e: MouseEvent) => {
            if (isLongPress) {
                e.preventDefault();
                e.stopPropagation();
                isLongPress = false; // 重置状态
            }
        };

        // 绑定事件
        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: true });
        el.addEventListener('touchend', onTouchEnd);
        el.addEventListener('touchcancel', onTouchCancel);
        el.addEventListener('contextmenu', preventContext);

        // 使用捕获阶段 (true) 来尽早拦截 click
        el.addEventListener('click', stopClickEvent, true);

        // 缓存清理函数
        (el as any)._touchHandlers = {
            onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, preventContext, stopClickEvent
        };
    },

    unmounted(el: HTMLElement) {
        const h = (el as any)._touchHandlers;
        if (h) {
            el.removeEventListener('touchstart', h.onTouchStart);
            el.removeEventListener('touchmove', h.onTouchMove);
            el.removeEventListener('touchend', h.onTouchEnd);
            el.removeEventListener('touchcancel', h.onTouchCancel);
            el.removeEventListener('contextmenu', h.preventContext);
            el.removeEventListener('click', h.stopClickEvent, true);
        }
    }
};