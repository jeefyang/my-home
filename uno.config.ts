import { defineConfig, presetWind4 } from 'unocss';

export default defineConfig({
    presets: [presetWind4()],
    rules: [

        [/^width-(\d+)$/, ([_, num]) => ({ 'width': `${num}%` })],
        [/^width-(\d+)px$/, ([_, num]) => ({ 'width': `${num}px` })],
        [/^height-(\d+)$/, ([_, num]) => ({ 'height': `${num}%` })],
        [/^height-(\d+)px$/, ([_, num]) => ({ 'height': `${num}px` })],
        [/^fs-(\d+)$/, ([_, num]) => ({ 'font-size': `${num}px` })],
        [/^scroll-none$/, () => ({ 'scrollbar-width': 'none' })]
    ],
});