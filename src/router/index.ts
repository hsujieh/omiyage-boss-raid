import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PartyView from '../views/PartyView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/p/:partyId', name: 'party', component: PartyView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
