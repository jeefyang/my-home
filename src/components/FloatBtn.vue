<template>
    <div
        class="main"
        ref="mainRef"
        :style="{
            opacity: curOpacity,
            top: !props.isBottom ? realY + 'px' : undefined,
            left: !props.isRight ? realX + 'px' : undefined,
            bottom: props.isBottom ? realY + 'px' : undefined,
            right: props.isRight ? realX + 'px' : undefined,
            scale: curScale
        }"
        v-touch:swipe.left="(e) => handleSelect('left', e)"
        v-touch:swipe.right="(e) => handleSelect('right', e)"
        v-touch:swipe.top="(e) => handleSelect('top', e)"
        v-touch:swipe.bottom="(e) => handleSelect('bottom', e)"
        v-touch:longtap="(e) => handleSelect('longtap', e)"
        v-touch:press="(e) => handleSelect('press', e)"
        v-touch:tap="(e) => handleSelect('tap', e)"
        dragOutside
        v-touch:drag="(e) => handleSelect('drag', e)"
        @dblclick="(e) => handleSelect('dblclick', e)"
    >
        <slot></slot>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const props = withDefaults(
    defineProps<{
        parentBox?: HTMLElement;
        /** 活动宽度范围 */
        boxWidth?: number;
        /** 活动高度范围 */
        boxHeight?: number;
        /** 元素展示形式 */
        displayType?: "absolute" | "fixed";
        /** 透明度 */
        opacity?: number;
        /** 缩放大小 */
        scale?: number;
        /** 坐标x */
        x?: number;
        /** 坐标y */
        y?: number;
        /** 是否自定义长按 */
        isCoustomLongPress?: boolean;
        /** 左吸附,undefined为不吸附 */
        adsorbLeft?: number;
        /** 上吸附,undefined为不吸附 */
        adsorbTop?: number;
        /** 右吸附,undefined为不吸附 */
        adsorbRight?: number;
        /** 下吸附,undefined为不吸附 */
        adsorbBottom?: number;
        /** 是否启用吸附 */
        isAdsorb?: boolean;
        /** 强制吸附 */
        forceAdsorb?: boolean;
        /** 吸附时边距 */
        adsorbPadding?: number;
        /** 吸附距离 */
        adsorbDistance?: number;
        /** 是否从下开始 */
        isBottom?: boolean;
        /** 是否从右开始 */
        isRight?: boolean;
    }>(),
    {
        displayType: "fixed",
        x: 0,
        y: 0,
        opacity: 0.5,
        scale: 1.5,
        adsorbLeft: 0,
        adsorbTop: 0,
        adsorbRight: 0,
        adsorbBottom: 0,
        isAdsorb: true,
        forceAdsorb: false,
        adsorbPadding: 10,
        adsorbDistance: 60
    }
);

const getModelBoxWidth = () => {
    return props.boxWidth || props.parentBox?.clientWidth || window.innerWidth;
};

const getModelBoxHeight = () => {
    return props.boxHeight || props.parentBox?.clientHeight || window.innerHeight;
};

/** 是否缩放 */
const isScale = ref(false);
/** 是否透明 */
const isOpacity = ref(true);

const mainRef = ref<HTMLElement>();
/** 悬浮按钮尺寸 */
let floatBtnRect: { width: number; height: number } = undefined;

/** 当前透明度 */
const curOpacity = computed(() => {
    return isOpacity.value ? props.opacity : 1;
});

/** 当前缩放 */
const curScale = computed(() => {
    return isScale.value ? props.scale : 1;
});

const emits = defineEmits(["swipe", "swipe.left", "swipe.right", "swipe.top", "swipe.bottom", "update:x", "update:y", "longtap", "tap", "dblclick", "longPress", "moveEnd"]);

const modelX = computed({
    get() {
        return props.x;
    },
    set(v: number) {
        emits("update:x", v);
    }
});

const modelY = computed({
    get() {
        return props.y;
    },
    set(v: number) {
        emits("update:y", v);
    }
});

const realX = ref(0);
const realY = ref(0);

let clientX: number | undefined = undefined;
let clientY: number | undefined = undefined;
const handleSelect = (v: string, e?: any) => {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
    }
    setNoOpacity();
    if (v == "left") {
        emits("swipe.left", e);
    } else if (v == "right") {
        emits("swipe.right", e);
    } else if (v == "top") {
        emits("swipe.top", e);
    } else if (v == "bottom") {
        emits("swipe.bottom", e);
    } else if (v == "press") {
        setLongPress(e);
    } else if (v == "longtap") {
        emits("longtap", e);
    } else if (v == "tap") {
        emits("tap", e);
    } else if (v == "dblclick") {
        emits("dblclick", e);
    } else if (v == "drag") {
    }
};

let noPacityTimer: any;
let noPacityTime = 2000;

const setNoOpacity = (isNoTime: boolean = false) => {
    isOpacity.value = false;
    if (noPacityTimer) {
        clearTimeout(noPacityTimer);
    }
    if (isNoTime) {
        return;
    }
    noPacityTimer = setTimeout(() => {
        isOpacity.value = true;
    }, noPacityTime);
};

let longPressTimer: any;
let longPressTime = 500;

const setMove = () => {
    const moveFn = (e: MouseEvent | TouchEvent) => {
        let x = -1;
        let y = -1;
        if (e instanceof TouchEvent) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        if (clientX == undefined || clientY == undefined) {
            clientX = x;
            clientY = y;
            return;
        }
        modelX.value += (x - clientX) * (props.isRight ? -1 : 1);
        modelY.value += (y - clientY) * (props.isBottom ? -1 : 1);
        clientX = x;
        clientY = y;
    };
    const endFn = (e: MouseEvent | TouchEvent) => {
        clientX = undefined;
        clientY = undefined;
        setNoOpacity();
        isScale.value = false;
        emits("moveEnd");
        document.body.removeEventListener("mousemove", moveFn);
        document.body.removeEventListener("touchmove", moveFn);
        document.body.removeEventListener("mouseup", endFn);
        document.body.removeEventListener("touchend", endFn);
    };
    document.body.addEventListener("mousemove", moveFn);
    document.body.addEventListener("mouseup", endFn);
    document.body.addEventListener("touchmove", moveFn);
    document.body.addEventListener("touchend", endFn);
};

const setLongPress = (e: any) => {
    longPressTimer = setTimeout(() => {
        if (props.isCoustomLongPress) {
            emits("longPress", e);
            return;
        }
        if (!mainRef.value) {
            return;
        }
        const div = mainRef.value;
        floatBtnRect = div.getBoundingClientRect();
        isScale.value = true;
        setNoOpacity(true);
        console.log("longPress");
        setMove();
        return;
    }, longPressTime);
};

const updateRealX = (v: number) => {
    if (floatBtnRect == undefined) {
        floatBtnRect = mainRef?.value?.getBoundingClientRect?.() || { width: 0, height: 0 };
    }
    if (!props.isAdsorb) {
        realX.value = v;
        return;
    }
    if (props.adsorbLeft == undefined && props.adsorbRight == undefined) {
        realX.value = v;
        return;
    }
    const boxWidth = getModelBoxWidth();
    // 转为中心点
    let centerX = v + floatBtnRect.width / 2;
    // 转为左上角
    if (props.isRight) {
        centerX = boxWidth - centerX;
    }
    const list = [props.adsorbLeft == undefined ? undefined : Math.abs(centerX - props.adsorbPadding), props.adsorbRight == undefined ? undefined : Math.abs(boxWidth - centerX - props.adsorbPadding)];
    // 左边
    if (list[0] != undefined && (list[1] == undefined || list[0] <= list[1])) {
        if (props.forceAdsorb || list[0] <= props.adsorbDistance + floatBtnRect.width / 2 + props.adsorbPadding) {
            centerX = props.adsorbPadding + floatBtnRect.width / 2 + props.adsorbLeft;
        }
    }
    // 右边
    else if (list[1] != undefined && (list[0] == undefined || list[1] < list[0])) {
        if (props.forceAdsorb || list[1] <= props.adsorbDistance + floatBtnRect.width / 2 + props.adsorbPadding) {
            centerX = boxWidth - props.adsorbPadding - floatBtnRect.width / 2 - props.adsorbRight;
        }
    }
    //恢复坐标位置
    if (props.isRight) {
        realX.value = boxWidth - centerX - floatBtnRect.width / 2;
    } else {
        realX.value = centerX - floatBtnRect.width / 2;
    }
};

const updateRealY = (v: number) => {
    if (!props.isAdsorb) {
        realY.value = v;
        return;
    }
    if (props.adsorbBottom == undefined && props.adsorbTop == undefined) {
        realY.value = v;
        return;
    }
    const boxHeight = getModelBoxHeight();
    // 转为中心点
    let centerY = v + floatBtnRect.height / 2;
    // 转为左上角
    if (props.isBottom) {
        centerY = boxHeight - centerY;
    }
    const list = [
        props.adsorbTop == undefined ? undefined : Math.abs(centerY - props.adsorbPadding),
        props.adsorbBottom == undefined ? undefined : Math.abs(boxHeight - centerY - props.adsorbPadding)
    ];
    // 上边
    if (list[0] != undefined && (list[1] == undefined || list[0] <= list[1])) {
        if (props.forceAdsorb || list[0] <= props.adsorbDistance + floatBtnRect.height / 2 + props.adsorbPadding) {
            centerY = props.adsorbPadding + floatBtnRect.height / 2 + props.adsorbTop;
        }
    }
    // 下边
    else if (list[1] != undefined && (list[0] == undefined || list[1] < list[0])) {
        if (props.forceAdsorb || list[1] <= props.adsorbDistance + floatBtnRect.height / 2 + props.adsorbPadding) {
            centerY = boxHeight - props.adsorbPadding - floatBtnRect.height / 2 - props.adsorbBottom;
        }
    }

    //恢复坐标位置
    if (props.isBottom) {
        realY.value = boxHeight - centerY - floatBtnRect.height / 2;
    } else {
        realY.value = centerY - floatBtnRect.height / 2;
    }
};

const setPos = (x: number, y: number) => {
    updateRealX(x);
    updateRealY(y);
    if (props.isAdsorb) {
        const boxWidth = getModelBoxWidth();
        const boxHeight = getModelBoxHeight();
        if (props.forceAdsorb) {
            const deltaX = Math.abs(x - realX.value);
            const deltaY = Math.abs(y - realY.value);

            if (deltaX > deltaY) {
                realX.value = Math.max(props.adsorbPadding, Math.min(boxWidth - props.adsorbPadding - (floatBtnRect?.width || 0), x));
            } else {
                realY.value = Math.max(props.adsorbPadding, Math.min(boxHeight - props.adsorbPadding - (floatBtnRect?.height || 0), y));
            }
        } else {
            realX.value = Math.max(props.adsorbPadding, Math.min(boxWidth - props.adsorbPadding - (floatBtnRect?.width || 0), realX.value));
            realY.value = Math.max(props.adsorbPadding, Math.min(boxHeight - props.adsorbPadding - (floatBtnRect?.height || 0), realY.value));
        }
    }
};

const initPos = () => {
    setPos(modelX.value, modelY.value);
    modelX.value = realX.value;
    modelY.value = realY.value;
};

onMounted(() => {
    watch(
        () => [modelX.value, modelY.value],
        ([x, y]) => {
            setPos(x, y);
        },
        { immediate: true }
    );
    // 等待父组件初始化先
    setTimeout(() => {
        initPos();
    }, 100);
    window.addEventListener("resize", () => {
        console.log("resize");
        // 等待父组件初始化先
        setTimeout(() => {
            initPos();
        }, 100);
    });
});
</script>
<style scoped>
.main {
    position: absolute;
    display: flex;
}
</style>
