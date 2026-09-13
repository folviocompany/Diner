import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import App from './App.vue';
import { router } from './router.js';
import 'primeicons/primeicons.css';
import './styles.css';

const preset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#edf6f2',
      100: '#d6e9e0',
      200: '#b4d4c4',
      300: '#8cbaa5',
      400: '#5d9b81',
      500: '#39775e',
      600: '#2b634e',
      700: '#20513f',
      800: '#183e35',
      900: '#13332b',
      950: '#0b201a',
    },
  },
});
createApp(App)
  .use(createPinia())
  .use(router)
  .use(PrimeVue, { theme: { preset, options: { darkModeSelector: '.diner-dark' } } })
  .component('PButton', Button)
  .component('PDialog', Dialog)
  .mount('#app');
