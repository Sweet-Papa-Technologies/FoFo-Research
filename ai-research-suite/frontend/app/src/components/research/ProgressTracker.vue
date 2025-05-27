<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">Research Progress</div>
      
      <q-linear-progress
        :value="progress.percentage / 100"
        class="q-mt-md"
        size="25px"
        :color="progressColor"
        animation-speed="300"
        rounded
      >
        <div class="absolute-full flex flex-center">
          <q-badge 
            color="white" 
            :text-color="progressColor" 
            :label="`${progress.percentage}%`" 
            class="text-weight-bold"
          />
        </div>
      </q-linear-progress>
      
      <div class="q-mt-lg">
        <div class="row">
          <div class="col-6">
            <div class="text-subtitle2 text-grey-7">Current Phase</div>
            <div class="text-body1 text-weight-medium">{{ progress.currentPhase }}</div>
          </div>
          
          <div class="col-6" v-if="progress.estimatedTimeRemaining">
            <div class="text-subtitle2 text-grey-7">Time Remaining</div>
            <div class="text-body1 text-weight-medium">{{ formatTime(progress.estimatedTimeRemaining) }}</div>
          </div>
        </div>
      </div>
    </q-card-section>
    
    <q-separator />
    
    <q-card-section>
      <div class="text-subtitle2 q-mb-sm">Completed Phases</div>
      <q-list dense>
        <q-item v-for="phase in progress.phasesCompleted" :key="phase" class="q-pl-none">
          <q-item-section avatar>
            <q-icon name="check_circle" color="positive" size="sm" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ phase }}</q-item-label>
          </q-item-section>
        </q-item>
        
        <q-item v-if="progress.currentPhase && !isCompleted" class="q-pl-none">
          <q-item-section avatar>
            <q-spinner-dots color="primary" size="20px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-primary">{{ progress.currentPhase }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
    
    <q-separator v-if="sources.length > 0" />
    
    <q-card-section v-if="sources.length > 0">
      <div class="text-subtitle2 q-mb-sm">
        Sources Found 
        <q-badge color="primary" :label="sources.length" class="q-ml-sm" />
      </div>
      
      <q-scroll-area style="height: 300px" class="q-pr-sm">
        <div v-for="(source, index) in sources" :key="index" class="q-mb-sm">
          <source-card :source="source" />
        </div>
      </q-scroll-area>
    </q-card-section>
    
    <q-separator v-if="showActions" />
    
    <q-card-actions v-if="showActions" align="right">
      <q-btn 
        v-if="canCancel"
        flat 
        label="Cancel" 
        color="negative"
        @click="$emit('cancel')"
        :loading="cancelling"
      />
      <q-btn 
        v-if="isCompleted && reportId"
        flat 
        label="View Report" 
        color="primary"
        icon-right="arrow_forward"
        :to="`/reports/${reportId}`"
      />
      <q-btn 
        v-if="isFailed"
        flat 
        label="Retry" 
        color="warning"
        @click="$emit('retry')"
        :loading="retrying"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import SourceCard from './SourceCard.vue';
import type { ResearchSession, ResearchSource } from '../../types/research';

const props = withDefaults(defineProps<{
  progress: ResearchSession['progress'];
  status: ResearchSession['status'];
  sources: ResearchSource[];
  reportId?: string;
  showActions?: boolean;
  cancelling?: boolean;
  retrying?: boolean;
}>(), {
  showActions: true,
  cancelling: false,
  retrying: false
});

defineEmits<{
  cancel: [];
  retry: [];
}>();

const progressColor = computed(() => {
  if (props.status === 'failed') return 'negative';
  if (props.status === 'completed') return 'positive';
  if (props.status === 'cancelled') return 'warning';
  return 'primary';
});

const isCompleted = computed(() => props.status === 'completed');
const isFailed = computed(() => props.status === 'failed');
const canCancel = computed(() => 
  ['pending', 'planning', 'researching', 'analyzing', 'writing'].includes(props.status)
);

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return 'Calculating...';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}
</script>