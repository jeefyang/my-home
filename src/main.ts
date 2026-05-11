import './assets/main.css';


import { createApp } from 'vue';
import App from './App.vue';
import { createPinia } from 'pinia';
import Vue3TouchEvents from "vue3-touch-events";


// 通用字体
import 'vfonts/Lato.css';
// 等宽字体
import 'vfonts/FiraCode.css';

import "virtual:uno.css";



const app = createApp(App);
app.use(createPinia());
app.use(Vue3TouchEvents);

app.mount('#app');

