import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  // Auth routes (no authentication required)
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('pages/auth/LoginPage.vue'),
        meta: { requiresAuth: false }
      }
    ]
  },
  {
    path: '/register',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('pages/auth/RegisterPage.vue'),
        meta: { requiresAuth: false }
      }
    ]
  },

  // Main app routes (authentication required)
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('pages/DashboardPage.vue')
      },
      {
        path: 'research',
        children: [
          {
            path: 'new',
            name: 'new-research',
            component: () => import('pages/research/NewResearch.vue')
          },
          {
            path: 'active/:id?',
            name: 'active-research',
            component: () => import('pages/research/ActiveResearch.vue')
          },
          {
            path: 'history',
            name: 'research-history',
            component: () => import('pages/research/ResearchHistory.vue')
          }
        ]
      },
      {
        path: 'reports/:id?',
        name: 'reports',
        component: () => import('pages/reports/ReportViewer.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('pages/settings/GeneralSettings.vue')
      }
    ]
  },

  // Always leave this as last one
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
