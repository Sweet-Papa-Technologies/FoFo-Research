import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/ResearchPage.vue'),
        name: 'home'
      },
      {
        path: 'research/new',
        component: () => import('pages/ResearchPage.vue'),
        name: 'new-research'
      },
      {
        path: 'reports',
        component: () => import('pages/ReportsPage.vue'),
        name: 'reports'
      },
      {
        path: 'reports/:id',
        component: () => import('pages/ReportDetailPage.vue'),
        name: 'report-detail'
      },
      {
        path: 'history',
        component: () => import('pages/HistoryPage.vue'),
        name: 'history'
      },
      {
        path: 'settings',
        component: () => import('pages/SettingsPage.vue'),
        name: 'settings'
      }
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
