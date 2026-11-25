import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './styles/pipboy.css';
import './styles/blueprint.css';

createApp(App).use(createPinia()).mount('#app');
