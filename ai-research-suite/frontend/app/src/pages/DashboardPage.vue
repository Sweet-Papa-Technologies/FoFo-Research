<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Dashboard</div>
    
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6 col-lg-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Active Research</div>
            <div class="text-h3 text-primary">{{ activeCount }}</div>
            <div class="text-caption text-grey">Currently running</div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-6 col-lg-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Completed</div>
            <div class="text-h3 text-positive">{{ completedCount }}</div>
            <div class="text-caption text-grey">Total reports</div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-6 col-lg-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Failed</div>
            <div class="text-h3 text-negative">{{ failedCount }}</div>
            <div class="text-caption text-grey">Need attention</div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-6 col-lg-3">
        <q-card>
          <q-card-section>
            <div class="text-h6">Total Sessions</div>
            <div class="text-h3">{{ totalCount }}</div>
            <div class="text-caption text-grey">All time</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
    
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12 col-lg-8">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Recent Research Sessions</div>
            
            <q-list separator v-if="recentSessions.length > 0">
              <q-item v-for="session in recentSessions" :key="session.id" clickable :to="`/reports/${session.reportId}`">
                <q-item-section>
                  <q-item-label>{{ session.topic }}</q-item-label>
                  <q-item-label caption>{{ formatDate(session.createdAt) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="getStatusColor(session.status)">
                    {{ session.status }}
                  </q-badge>
                </q-item-section>
              </q-item>
            </q-list>
            
            <div v-else class="text-center q-pa-lg text-grey-6">
              No research sessions yet. Start your first research!
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-lg-4">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Quick Actions</div>
            
            <q-btn
              color="primary"
              label="New Research"
              icon="add"
              class="full-width q-mb-sm"
              to="/research/new"
              unelevated
            />
            
            <q-btn
              color="secondary"
              label="View Active"
              icon="pending"
              class="full-width q-mb-sm"
              to="/research/active"
              outline
            />
            
            <q-btn
              color="secondary"
              label="Research History"
              icon="history"
              class="full-width"
              to="/research/history"
              outline
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useResearchStore } from '../stores/research';

const researchStore = useResearchStore();

const activeCount = computed(() => researchStore.activeSessionCount);
const completedCount = computed(() => researchStore.completedSessions.length);
const failedCount = computed(() => researchStore.failedSessions.length);
const totalCount = computed(() => researchStore.sessionHistory.length + researchStore.activeSessionCount);

const recentSessions = computed(() => {
  const allSessions = [
    ...Array.from(researchStore.activeSessions.values()),
    ...researchStore.sessionHistory
  ];
  
  return allSessions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
});

onMounted(async () => {
  try {
    await researchStore.fetchSessionHistory();
  } catch (error) {
    console.error('Failed to load session history:', error);
  }
});

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
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>