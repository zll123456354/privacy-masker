import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import TextMask from '../views/TextMask.vue'
import IdCardOcr from '../views/IdCardOcr.vue'
import CesiumViewer from '../views/CesiumViewer.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/text-mask', name: 'text-mask', component: TextMask },
  { path: '/id-card-ocr', name: 'id-card-ocr', component: IdCardOcr },
  { path: '/cesium', name: 'cesium', component: CesiumViewer }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
