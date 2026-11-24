<template>
    <div class="gate">
        <main class="gate__frame">
            <section class="intro">
                <p class="host-mark">{{ host }}</p>
                <h1 class="title">回到你的主页</h1>
                <p class="lede">这台机器上的页面，只对持有凭据的人展开。</p>
                <dl class="facts">
                    <div class="fact">
                        <dt>存储</dt>
                        <dd>凭据保存在本机 localStorage，刷新后仍然有效</dd>
                    </div>
                    <div class="fact">
                        <dt>优先级</dt>
                        <dd>地址栏参数优先于本地缓存</dd>
                    </div>
                    <div class="fact">
                        <dt>首次运行</dt>
                        <dd>自动创建管理员，不需要注册</dd>
                    </div>
                </dl>
            </section>

            <section class="panel">
                <form class="form" novalidate @submit.prevent="submit">
                    <div class="field">
                        <label class="field__label" for="gate-path">唯一路径</label>
                        <input
                            id="gate-path"
                            ref="pathInput"
                            v-model="pathID"
                            class="field__input"
                            type="text"
                            name="pathid"
                            autocomplete="username"
                            autocapitalize="off"
                            spellcheck="false"
                            placeholder="例如 admin_1234"
                            aria-describedby="gate-path-hint"
                        />
                        <p id="gate-path-hint" class="field__hint">创建账号时设定，通常是 10 位字母数字。</p>
                    </div>

                    <div class="field">
                        <label class="field__label" for="gate-code">二次验证码</label>
                        <input
                            id="gate-code"
                            v-model="secondCode"
                            class="field__input"
                            type="password"
                            name="secondcode"
                            autocomplete="current-password"
                            spellcheck="false"
                            placeholder="没有设置可留空"
                            aria-describedby="gate-code-hint"
                        />
                        <p id="gate-code-hint" class="field__hint">区分大小写，留空表示该账号未启用二次码。</p>
                    </div>

                    <fieldset class="field field--choice">
                        <legend class="field__label">登录后如何处理地址栏</legend>
                        <div class="segmented">
                            <label class="segment">
                                <input v-model="fixedUrl" type="radio" name="fixed-url" :value="0" />
                                <span>不改动</span>
                            </label>
                            <label class="segment">
                                <input v-model="fixedUrl" type="radio" name="fixed-url" :value="1" />
                                <span>写入地址</span>
                            </label>
                            <label class="segment">
                                <input v-model="fixedUrl" type="radio" name="fixed-url" :value="-1" />
                                <span>从地址移除</span>
                            </label>
                        </div>
                    </fieldset>

                    <p class="address">
                        <span class="address__host">{{ host }}</span>
                        <span v-if="fixedUrl === 1" class="address__query">?pathid={{ pathID || "…" }}<template v-if="secondCode">&amp;secondcode=•••</template></span>
                        <span v-else class="address__note">{{ fixedUrl === -1 ? "凭据将从地址栏移除" : "地址栏保持原样" }}</span>
                    </p>

                    <p v-if="error" class="error" role="alert">{{ error }}</p>

                    <button class="submit" type="submit" :disabled="loading">
                        <span>{{ loading ? "核对中" : "进入主页" }}</span>
                        <svg class="submit__arrow" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M3 10h13M11 4.5 16.5 10 11 15.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                </form>
            </section>
        </main>
    </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useCredentialLogin } from "@/composables/useCredentialLogin";

const host = computed(() => window.location.host);
const pathID = ref("");
const secondCode = ref("");
const fixedUrl = ref(0);
const pathInput = ref<HTMLInputElement>();

const { loading, error, login } = useCredentialLogin();

// 用户开始修正输入时立刻收起旧错误，避免提示和当前内容自相矛盾
watch([pathID, secondCode], () => {
    error.value = "";
});

onMounted(() => {
    // 触屏设备不自动聚焦，避免一进门就弹起键盘把画面顶走
    if (window.innerWidth >= 900) {
        pathInput.value?.focus();
    }
});

const submit = async () => {
    if (!pathID.value.trim()) {
        error.value = "请先填写唯一路径";
        pathInput.value?.focus();
        return;
    }
    await login({
        pathID: pathID.value.trim(),
        secondCode: secondCode.value,
        fixedUrl: fixedUrl.value,
        verifyFirst: true
    });
};
</script>
<style scoped>
.gate {
    --ink: #0a0d0c;
    --surface: #101513;
    --text: #e8eeea;
    --muted: #93a49b;
    --accent: #63e2b7;
    --accent-strong: #8af2cf;
    --accent-ink: #06201a;
    --danger: #ffb3a1;
    --line: rgba(232, 238, 234, 0.14);

    --font-display: "Songti SC", "Noto Serif SC", "Source Han Serif SC", STSong, SimSun, serif;
    --font-body: "Lato", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    --font-mono: "Fira Code", ui-monospace, SFMono-Regular, Consolas, monospace;

    --radius: 2px;

    position: fixed;
    inset: 0;
    z-index: 900;
    overflow-y: auto;
    background: var(--ink);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
}

.gate__frame {
    width: min(1180px, 100%);
    min-height: 100%;
    margin: 0 auto;
    padding: clamp(40px, 8vh, 96px) clamp(20px, 5vw, 64px);
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    gap: clamp(32px, 6vw, 96px);
    align-items: center;
}

/* 左栏：门牌、标题、三条事实 */
.intro {
    max-width: 34em;
}

.host-mark {
    margin: 0 0 28px;
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 0.02em;
    color: var(--muted);
}

.title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(40px, 4.6vw, 64px);
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: var(--text);
}

.lede {
    margin: 20px 0 0;
    max-width: 26em;
    font-size: 16px;
    line-height: 1.7;
    color: var(--muted);
}

.facts {
    margin: clamp(32px, 5vh, 56px) 0 0;
    display: grid;
    gap: 14px;
}

.fact {
    display: grid;
    grid-template-columns: 5.5em minmax(0, 1fr);
    gap: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
}

.fact dt {
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.9;
    color: var(--accent);
}

.fact dd {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
}

/* 右栏：表单 */
.panel {
    border-left: 1px solid var(--line);
    padding-left: clamp(24px, 4vw, 56px);
}

.form {
    display: grid;
    gap: 0;
    width: 100%;
    max-width: 420px;
}

.field {
    display: grid;
    gap: 8px;
    margin: 0 0 26px;
    padding: 0;
    border: 0;
    min-width: 0;
}

.field__label {
    font-size: 13px;
    letter-spacing: 0.04em;
    color: var(--muted);
}

.field__input {
    width: 100%;
    min-height: 48px;
    padding: 10px 0;
    border: 0;
    border-bottom: 1px solid var(--line);
    border-radius: 0;
    background: transparent;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.4;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.field__input::placeholder {
    color: rgba(147, 164, 155, 0.72);
}

.field__input:focus {
    outline: none;
    border-bottom-color: var(--accent);
    box-shadow: 0 1px 0 var(--accent);
}

.field__hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
}

.field--choice {
    margin-bottom: 24px;
}

.segmented {
    display: flex;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
}

.segment {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 44px;
    display: grid;
    place-items: center;
    padding: 0 6px;
    font-size: 13px;
    color: var(--muted);
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease;
}

.segment + .segment {
    border-left: 1px solid var(--line);
}

.segment input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
}

.segment span {
    pointer-events: none;
}

.segment:hover {
    color: var(--text);
}

.segment:has(input:checked) {
    background: rgba(99, 226, 183, 0.12);
    color: var(--text);
}

.segment:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
}

/* 记忆点：随输入实时拼出的登录地址 */
.address {
    display: flex;
    align-items: baseline;
    gap: 0;
    min-width: 0;
    margin: 0 0 20px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
    white-space: nowrap;
}

.address__host {
    color: var(--text);
}

.address__query {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--accent);
}

.address__note {
    margin-left: 8px;
    color: var(--muted);
}

.error {
    margin: 0 0 18px;
    padding: 8px 0 8px 12px;
    border-left: 2px solid var(--danger);
    font-size: 14px;
    line-height: 1.5;
    color: var(--danger);
}

.submit {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 20px;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--accent-ink);
    font-family: var(--font-body);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.18s ease;
}

.submit__arrow {
    flex: 0 0 auto;
    transition: transform 0.18s ease;
}

.submit:not(:disabled):hover {
    background: var(--accent-strong);
}

.submit:not(:disabled):hover .submit__arrow {
    transform: translateX(4px);
}

.submit:focus-visible {
    outline: 2px solid var(--text);
    outline-offset: 3px;
}

.submit:disabled {
    opacity: 0.55;
    cursor: progress;
}

@media (prefers-reduced-motion: no-preference) {
    .intro > * {
        animation: rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
    }

    .intro > *:nth-child(2) {
        animation-delay: 0.06s;
    }

    .intro > *:nth-child(3) {
        animation-delay: 0.12s;
    }

    .intro > *:nth-child(4) {
        animation-delay: 0.18s;
    }

    .panel {
        animation: rise 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) 0.1s both;
    }
}

@keyframes rise {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@media (max-width: 899px) {
    .gate__frame {
        grid-template-columns: minmax(0, 1fr);
        gap: 36px;
        align-items: start;
        align-content: start;
        padding: clamp(32px, 7vh, 64px) 20px 48px;
    }

    .panel {
        border-left: 0;
        border-top: 1px solid var(--line);
        padding-left: 0;
        padding-top: 32px;
    }

    .title {
        font-size: clamp(34px, 9vw, 44px);
    }

    .lede {
        margin-top: 14px;
        font-size: 15px;
    }

    .facts {
        margin-top: 28px;
        gap: 10px;
    }

    .form {
        max-width: none;
    }
}

/* 手机：先保证表单和主按钮一屏可见，三条说明让位给操作 */
@media (max-width: 639px) {
    .gate__frame {
        gap: 24px;
        padding: 24px 20px 32px;
    }

    .host-mark {
        margin-bottom: 18px;
    }

    .lede {
        margin-top: 12px;
    }

    .facts {
        display: none;
    }
}
</style>
