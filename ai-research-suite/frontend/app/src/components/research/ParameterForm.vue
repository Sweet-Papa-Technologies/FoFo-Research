<template>
  <div class="parameter-form">
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-input
          v-model.number="localParameters.maxSources"
          type="number"
          label="Maximum Sources"
          outlined
          :min="5"
          :max="500"
          hint="Maximum number of sources to analyze (5-500)"
        />
      </div>
      
      <div class="col-12 col-md-6">
        <q-input
          v-model.number="localParameters.minSources"
          type="number"
          label="Minimum Sources"
          outlined
          :min="1"
          :max="50"
          hint="Minimum sources required (1-50)"
        />
      </div>
      
      <div class="col-12 col-md-6">
        <q-select
          v-model="localParameters.reportLength"
          :options="reportLengthOptions"
          label="Report Length"
          outlined
          emit-value
          map-options
        />
      </div>
      
      <div class="col-12 col-md-6">
        <q-select
          v-model="localParameters.depth"
          :options="depthOptions"
          label="Research Depth"
          outlined
          emit-value
          map-options
        />
      </div>
      
      <div class="col-12">
        <q-toggle
          v-model="localParameters.includeVisuals"
          label="Include Visual Elements"
          hint="Add charts, diagrams, and visual summaries to the report"
        />
      </div>
      
      <div class="col-12">
        <q-select
          v-model="localParameters.sourceTypes"
          :options="sourceTypeOptions"
          label="Source Types"
          outlined
          multiple
          emit-value
          map-options
          use-chips
          hint="Select preferred source types (leave empty for all)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ResearchParameters } from '../../types/research';

const props = defineProps<{
  modelValue: ResearchParameters;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ResearchParameters];
}>();

const localParameters = ref<ResearchParameters>({
  maxSources: 20,
  minSources: 5,
  reportLength: 'medium',
  depth: 'standard',
  includeVisuals: false,
  sourceTypes: [],
  ...props.modelValue
});

const reportLengthOptions = [
  { label: 'Short (1-2 pages)', value: 'short' },
  { label: 'Medium (3-5 pages)', value: 'medium' },
  { label: 'Long (6+ pages)', value: 'long' }
];

const depthOptions = [
  { label: 'Basic - Quick overview', value: 'basic' },
  { label: 'Standard - Balanced analysis', value: 'standard' },
  { label: 'Comprehensive - In-depth research', value: 'comprehensive' }
];

const sourceTypeOptions = [
  { label: 'Academic Papers', value: 'academic' },
  { label: 'News Articles', value: 'news' },
  { label: 'Blog Posts', value: 'blog' },
  { label: 'Research Reports', value: 'research' },
  { label: 'Technical Documentation', value: 'technical' },
  { label: 'Government Sources', value: 'government' }
];

watch(localParameters, (newValue) => {
  emit('update:modelValue', newValue);
}, { deep: true });

watch(() => props.modelValue, (newValue) => {
  localParameters.value = { ...localParameters.value, ...newValue };
}, { deep: true });
</script>

<style lang="scss" scoped>
.parameter-form {
  width: 100%;
}
</style>