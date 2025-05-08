<template>
  <q-badge 
    :class="badgeClass" 
    :color="badgeColor" 
    :text-color="textColor" 
    :label="statusLabel"
    class="q-px-sm"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { JobStatus } from 'src/components/models';

const props = defineProps<{
  status: JobStatus;
  small?: boolean;
}>();

const badgeColor = computed(() => {
  switch (props.status) {
    case JobStatus.PENDING:
      return 'grey-7';
    case JobStatus.RUNNING:
      return 'primary';
    case JobStatus.COMPLETED:
      return 'positive';
    case JobStatus.FAILED:
      return 'negative';
    case JobStatus.PAUSED:
      return 'warning';
    default:
      return 'grey';
  }
});

const textColor = computed(() => {
  switch (props.status) {
    case JobStatus.RUNNING:
    case JobStatus.COMPLETED:
    case JobStatus.FAILED:
    case JobStatus.PAUSED:
      return 'white';
    default:
      return 'white';
  }
});

const statusLabel = computed(() => {
  switch (props.status) {
    case JobStatus.PENDING:
      return 'Pending';
    case JobStatus.RUNNING:
      return 'Running';
    case JobStatus.COMPLETED:
      return 'Completed';
    case JobStatus.FAILED:
      return 'Failed';
    case JobStatus.PAUSED:
      return 'Paused';
    default:
      return 'Unknown';
  }
});

const badgeClass = computed(() => {
  return props.small ? 'text-caption' : '';
});
</script>

<style scoped>
.q-badge {
  font-weight: 600;
}
</style>