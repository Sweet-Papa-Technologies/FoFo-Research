<template>
  <q-card class="job-progress-card card-dark q-mb-md">
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6 ellipsis">{{ job.topic }}</div>
        <status-badge :status="job.status" />
      </div>
      
      <div class="text-caption text-grey q-mb-md">
        Job ID: {{ job.id }} | Created: {{ createdTimeFormatted }}
      </div>
      
      <q-linear-progress
        :value="progressValue"
        :color="progressColor"
        size="md"
        rounded
        stripe
        :animate="job.status === 'running'"
        class="q-mb-sm"
      />
      
      <div class="row items-center justify-between text-caption q-mt-xs">
        <div>
          <q-icon name="link" size="xs" class="q-mr-xs" />
          {{ job.progress.processedUrls || 0 }}/{{ job.progress.totalUrls || 0 }} URLs processed
        </div>
        <div>
          <q-icon name="repeat" size="xs" class="q-mr-xs" />
          Iteration {{ job.progress.currentIteration || 0 }}/{{ job.config.maxIterations || 5 }}
        </div>
        <div>{{ progressPercentFormatted }}</div>
      </div>
    </q-card-section>
    
    <q-separator dark inset />
    
    <q-card-actions align="right">
      <q-btn 
        v-if="job.status === 'running'" 
        flat 
        color="warning" 
        icon="pause" 
        label="Pause" 
        @click="$emit('pause', job.id)" 
      />
      <q-btn 
        v-if="job.status === 'paused'" 
        flat 
        color="primary" 
        icon="play_arrow" 
        label="Resume" 
        @click="$emit('resume', job.id)" 
      />
      <q-btn 
        v-if="job.status === 'completed'" 
        flat 
        color="positive" 
        icon="visibility" 
        label="View Report" 
        @click="$emit('view-report', job.reportId)" 
        :disable="!job.reportId"
      />
      <q-btn 
        v-if="['pending', 'running', 'paused'].includes(job.status)" 
        flat 
        color="negative" 
        icon="cancel" 
        label="Cancel" 
        @click="$emit('cancel', job.id)" 
      />
      <q-btn 
        flat 
        color="primary" 
        icon="info" 
        label="Details" 
        @click="$emit('details', job.id)" 
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from 'components/StatusBadge.vue';
import { ResearchJob, JobStatus } from 'src/components/models';

const props = defineProps<{
  job: ResearchJob;
}>();

defineEmits<{
  (e: 'pause', id: string): void;
  (e: 'resume', id: string): void;
  (e: 'cancel', id: string): void;
  (e: 'details', id: string): void;
  (e: 'view-report', reportId?: string): void;
}>();

const createdTimeFormatted = computed(() => {
  const date = new Date(props.job.createdAt);
  return date.toLocaleString();
});

const progressValue = computed(() => {
  if (!props.job.progress || !props.job.progress.totalUrls) {
    return 0;
  }
  
  // Progress based on processed URLs and iterations
  const urlProgress = props.job.progress.processedUrls / props.job.progress.totalUrls;
  const iterationProgress = props.job.progress.currentIteration / (props.job.config?.maxIterations || 5);
  
  // Weighted average (70% URL progress, 30% iteration progress)
  const combinedProgress = urlProgress * 0.7 + iterationProgress * 0.3;
  
  return Math.min(Math.max(combinedProgress, 0), 1);
});

const progressPercentFormatted = computed(() => {
  return `${Math.round(progressValue.value * 100)}%`;
});

const progressColor = computed(() => {
  if (props.job.status === JobStatus.COMPLETED) {
    return 'positive';
  }
  if (props.job.status === JobStatus.FAILED) {
    return 'negative';
  }
  if (props.job.status === JobStatus.PAUSED) {
    return 'warning';
  }
  return 'primary';
});
</script>

<style scoped>
.job-progress-card {
  transition: all 0.3s ease;
}

.job-progress-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}
</style>