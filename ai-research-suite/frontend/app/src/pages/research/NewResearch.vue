<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">New Research</div>
    
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Research Topic</div>
        
        <q-input
          v-model="topic"
          type="textarea"
          filled
          label="What would you like to research?"
          placeholder="Enter your research topic or question..."
          :rules="topicRules"
          counter
          maxlength="500"
          autogrow
          autofocus
          class="q-mb-md"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
        
        <div class="text-caption text-grey-6">
          Be specific about what you want to research. The more detailed your topic, the better the results.
        </div>
      </q-card-section>
    </q-card>
    
    <q-card>
      <q-expansion-item
        v-model="showAdvanced"
        label="Advanced Parameters"
        icon="settings"
        header-class="text-h6"
      >
        <q-separator />
        <q-card-section>
          <parameter-form v-model="parameters" />
        </q-card-section>
      </q-expansion-item>
      
      <q-separator />
      
      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="Reset"
          @click="resetForm"
          :disable="loading"
        />
        <q-space />
        <q-btn
          flat
          label="Cancel"
          to="/dashboard"
          :disable="loading"
        />
        <q-btn
          unelevated
          color="primary"
          label="Start Research"
          icon-right="arrow_forward"
          :loading="loading"
          :disable="!isValid || loading"
          @click="startResearch"
        />
      </q-card-actions>
    </q-card>
    
    <q-dialog v-model="showConfirmDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Confirm Research</div>
        </q-card-section>
        
        <q-card-section>
          <p><strong>Topic:</strong> {{ topic }}</p>
          <p class="q-mb-none">This research session will analyze up to {{ parameters.maxSources }} sources.</p>
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn 
            flat 
            label="Start" 
            color="primary" 
            @click="confirmResearch"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResearchStore } from '../../stores/research';
import ParameterForm from '../../components/research/ParameterForm.vue';
import type { ResearchParameters } from '../../types/research';

const router = useRouter();
const $q = useQuasar();
const researchStore = useResearchStore();

const topic = ref('');
const parameters = ref<ResearchParameters>({
  maxSources: 20,
  minSources: 5,
  reportLength: 'medium',
  depth: 'standard',
  includeVisuals: false,
  sourceTypes: []
});
const showAdvanced = ref(false);
const loading = ref(false);
const showConfirmDialog = ref(false);

const topicRules = [
  (val: string) => (val && val.length >= 3) || 'Topic must be at least 3 characters',
  (val: string) => (val && val.length <= 500) || 'Topic must be less than 500 characters'
];

const isValid = computed(() => 
  topic.value.length >= 3 && topic.value.length <= 500
);

function resetForm() {
  topic.value = '';
  parameters.value = {
    maxSources: 20,
    minSources: 5,
    reportLength: 'medium',
    depth: 'standard',
    includeVisuals: false,
    sourceTypes: []
  };
  showAdvanced.value = false;
}

function startResearch() {
  if (!isValid.value) return;
  showConfirmDialog.value = true;
}

async function confirmResearch() {
  loading.value = true;
  showConfirmDialog.value = false;
  
  try {
    const session = await researchStore.startResearch({
      topic: topic.value,
      parameters: parameters.value
    });
    
    $q.notify({
      type: 'positive',
      message: 'Research started successfully!',
      position: 'top'
    });
    
    await router.push(`/research/active/${session.id}`);
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to start research',
      position: 'top',
      timeout: 5000
    });
  } finally {
    loading.value = false;
  }
}
</script>