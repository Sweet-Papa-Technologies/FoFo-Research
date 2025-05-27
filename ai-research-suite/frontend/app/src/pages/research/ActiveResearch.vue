<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Active Research</div>
    
    <div v-if="loading" class="row justify-center q-mt-xl">
      <q-spinner-dots color="primary" size="50px" />
    </div>
    
    <div v-else-if="!currentSession && activeSessions.length === 0" class="text-center q-mt-xl">
      <q-icon name="pending_actions" size="100px" color="grey-5" />
      <div class="text-h6 text-grey-7 q-mt-md">No Active Research Sessions</div>
      <div class="text-body1 text-grey-6 q-mt-sm">
        Start a new research session to see it here.
      </div>
      <q-btn
        color="primary"
        label="Start New Research"
        icon="add"
        to="/research/new"
        class="q-mt-lg"
        unelevated
      />
    </div>
    
    <div v-else class="row q-col-gutter-md">
      <div class="col-12 col-lg-8">
        <q-card v-if="currentSession">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">{{ currentSession.topic }}</div>
                <div class="text-caption text-grey-6">
                  Started {{ formatDate(currentSession.createdAt) }}
                </div>
              </div>
              <div class="col-auto">
                <q-badge :color="getStatusColor(currentSession.status)" class="q-pa-sm">
                  {{ currentSession.status }}
                </q-badge>
              </div>
            </div>
          </q-card-section>
          
          <q-separator />
          
          <q-card-section>
            <progress-tracker
              :progress="currentSession.progress"
              :status="currentSession.status"
              :sources="currentSources"
              :report-id="currentSession.reportId || undefined"
              :cancelling="cancelling"
              :retrying="retrying"
              @cancel="cancelResearch"
              @retry="retryResearch"
            />
          </q-card-section>
        </q-card>
        
        <div v-else class="text-center q-pa-xl">
          <div class="text-h6 text-grey-7">Select a research session</div>
          <div class="text-body1 text-grey-6">
            Choose from the active sessions on the right
          </div>
        </div>
      </div>
      
      <div class="col-12 col-lg-4">
        <q-card>
          <q-card-section>
            <div class="text-h6">Active Sessions ({{ activeSessions.length }})</div>
          </q-card-section>
          
          <q-separator />
          
          <q-list separator>
            <q-item
              v-for="session in activeSessions"
              :key="session.id"
              clickable
              :active="currentSession?.id === session.id"
              @click="selectSession(session.id)"
            >
              <q-item-section>
                <q-item-label class="ellipsis">{{ session.topic }}</q-item-label>
                <q-item-label caption>
                  {{ session.progress.currentPhase }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-circular-progress
                  :value="session.progress.percentage"
                  size="40px"
                  :thickness="0.2"
                  color="primary"
                  track-color="grey-3"
                >
                  <div class="text-caption">
                    {{ session.progress.percentage }}%
                  </div>
                </q-circular-progress>
              </q-item-section>
            </q-item>
          </q-list>
          
          <q-card-actions>
            <q-btn
              flat
              label="View All History"
              icon-right="arrow_forward"
              to="/research/history"
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResearchStore } from '../../stores/research';
import ProgressTracker from '../../components/research/ProgressTracker.vue';

const route = useRoute();
const $q = useQuasar();
const researchStore = useResearchStore();

const loading = ref(true);
const cancelling = ref(false);
const retrying = ref(false);

const currentSession = computed(() => researchStore.currentSession);
const currentSources = computed(() => researchStore.currentSources);
const activeSessions = computed(() => 
  Array.from(researchStore.activeSessions.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
);

watch(() => route.params.id, (newId) => {
  if (newId && typeof newId === 'string') {
    selectSession(newId);
  }
}, { immediate: true });

onMounted(async () => {
  try {
    await researchStore.fetchSessionHistory();
    
    // If there's an ID in the route, select that session
    const sessionId = route.params.id;
    if (sessionId && typeof sessionId === 'string') {
      await selectSession(sessionId);
    } else if (activeSessions.value.length > 0) {
      // Otherwise select the first active session
      void selectSession(activeSessions.value[0].id);
    }
  } catch (error) {
    console.error('Failed to load sessions:', error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  // Clean up any session-specific listeners if needed
});

async function selectSession(sessionId: string) {
  loading.value = true;
  try {
    await researchStore.fetchSession(sessionId);
    researchStore.setCurrentSession(sessionId);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load session details',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}

async function cancelResearch() {
  if (!currentSession.value) return;
  
  $q.dialog({
    title: 'Cancel Research',
    message: 'Are you sure you want to cancel this research session? This action cannot be undone.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    cancelling.value = true;
    try {
      if (!currentSession.value) return;
      await researchStore.cancelResearch(currentSession.value.id);
      
      $q.notify({
        type: 'positive',
        message: 'Research cancelled successfully',
        position: 'top'
      });
      
      // Select another session if available
      if (activeSessions.value.length > 0) {
        void selectSession(activeSessions.value[0].id);
      }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to cancel research',
        position: 'top'
      });
    } finally {
      cancelling.value = false;
    }
  });
}

async function retryResearch() {
  if (!currentSession.value) return;
  
  retrying.value = true;
  try {
    const newSession = await researchStore.retryResearch(currentSession.value.id);
    
    $q.notify({
      type: 'positive',
      message: 'Research restarted successfully',
      position: 'top'
    });
    
    selectSession(newSession.id);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to retry research',
      position: 'top'
    });
  } finally {
    retrying.value = false;
  }
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'positive',
    failed: 'negative',
    cancelled: 'warning',
    planning: 'info',
    researching: 'info',
    analyzing: 'info',
    writing: 'info',
    pending: 'grey'
  };
  return colors[status] || 'grey';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
  
  return date.toLocaleDateString();
}
</script>

<style lang="scss" scoped>
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>