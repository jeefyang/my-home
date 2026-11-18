import './assets/main.css';


import { createApp, type Plugin } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import Vue3TouchEvents from "vue3-touch-events";
import VConsole from 'vconsole';


// 通用字体
import 'vfonts/Lato.css';
// 等宽字体
import 'vfonts/FiraCode.css';

import "virtual:uno.css";



const app = createApp(App);
app.use(createPinia());
app.use(Vue3TouchEvents as Plugin);

app.mount('#app');
if (process.env.NODE_ENV == 'development') {
    new VConsole();
}
