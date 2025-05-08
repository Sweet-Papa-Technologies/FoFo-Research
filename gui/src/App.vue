<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onMounted } from 'vue';

const $q = useQuasar();

onMounted(() => {
  // Enable dark mode by default
  $q.dark.set(true);
});
</script>