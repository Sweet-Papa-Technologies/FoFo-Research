<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          AI Research Suite
        </q-toolbar-title>

        <q-space />

        <q-btn
          flat
          round
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          @click="$q.dark.toggle"
        />
        
        <q-btn flat round icon="account_circle">
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item v-if="authStore.user">
                <q-item-section>
                  <q-item-label>{{ authStore.user.email }}</q-item-label>
                  <q-item-label caption>{{ authStore.user.role }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item clickable v-close-popup to="/settings">
                <q-item-section avatar>
                  <q-icon name="settings" />
                </q-item-section>
                <q-item-section>Settings</q-item-section>
              </q-item>
              
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <q-item
          v-for="item in navigationItems"
          :key="item.path"
          :to="item.path"
          exact
          clickable
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ item.label }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const leftDrawerOpen = ref(false);

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/research/new', label: 'New Research', icon: 'add_circle' },
  { path: '/research/active', label: 'Active Research', icon: 'pending' },
  { path: '/research/history', label: 'Research History', icon: 'history' },
  { path: '/reports', label: 'Reports', icon: 'description' },
  { path: '/settings', label: 'Settings', icon: 'settings' }
];

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function logout() {
  try {
    await authStore.logout();
    await router.push('/login');
    
    $q.notify({
      type: 'positive',
      message: 'Successfully logged out',
      position: 'top'
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Logout failed',
      position: 'top'
    });
  }
}
</script>
