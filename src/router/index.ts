import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import TextMask from '../views/TextMask.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/text-mask', name: 'text-mask', component: TextMask }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
