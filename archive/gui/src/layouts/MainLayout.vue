<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark">
    <q-header elevated class="bg-dark">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title class="text-h5">
          <q-icon name="auto_awesome" size="md" class="q-mr-md" />
          FoFo Research
        </q-toolbar-title>

        <q-btn flat round icon="dark_mode" aria-label="Dark Mode" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-dark-page text-white"
    >
      <q-list>
        <q-item-label header class="text-grey-5">
          Navigation
        </q-item-label>

        <EssentialLink
          v-for="link in navigationLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const navigationLinks: EssentialLinkProps[] = [
  {
    title: 'Home',
    caption: 'Application Dashboard',
    icon: 'home',
    link: '/'
  },
  {
    title: 'New Research',
    caption: 'Start a new research project',
    icon: 'science',
    link: '/research/new'
  },
  {
    title: 'Reports',
    caption: 'View completed research reports',
    icon: 'summarize',
    link: '/reports'
  },
  {
    title: 'History',
    caption: 'View research history',
    icon: 'history',
    link: '/history'
  },
  {
    title: 'Settings',
    caption: 'Configure application settings',
    icon: 'settings',
    link: '/settings'
  }
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

onMounted(() => {
  // Enable dark mode by default
  $q.dark.set(true);
});
</script>