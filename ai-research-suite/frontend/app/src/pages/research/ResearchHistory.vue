<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <div class="text-h4">Research History</div>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          label="New Research"
          icon="add"
          to="/research/new"
          unelevated
        />
      </div>
    </div>
    
    <q-card>
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="searchQuery"
              label="Search"
              outlined
              dense
              clearable
              debounce="300"
            >
              <template v-slot:prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          
          <div class="col-12 col-md-3">
            <q-select
              v-model="statusFilter"
              :options="statusOptions"
              label="Status"
              outlined
              dense
              clearable
              emit-value
              map-options
            />
          </div>
          
          <div class="col-12 col-md-3">
            <q-select
              v-model="sortBy"
              :options="sortOptions"
              label="Sort By"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
        </div>
      </q-card-section>
      
      <q-separator />
      
      <div v-if="loading" class="q-pa-xl text-center">
        <q-spinner-dots color="primary" size="50px" />
      </div>
      
      <q-list v-else-if="filteredSessions.length > 0" separator>
        <q-item
          v-for="session in paginatedSessions"
          :key="session.id"
          clickable
          @click="viewSession(session)"
        >
          <q-item-section avatar>
            <q-icon 
              :name="getStatusIcon(session.status)" 
              :color="getStatusColor(session.status)"
              size="md"
            />
          </q-item-section>
          
          <q-item-section>
            <q-item-label class="text-subtitle1">{{ session.topic }}</q-item-label>
            <q-item-label caption>
              {{ formatDate(session.createdAt) }}
              <span v-if="session.completedAt">
                • Completed in {{ getDuration(session.createdAt, session.completedAt) }}
              </span>
            </q-item-label>
          </q-item-section>
          
          <q-item-section side>
            <div class="text-right">
              <q-badge :color="getStatusColor(session.status)" class="q-mb-xs">
                {{ session.status }}
              </q-badge>
              <div v-if="session.parameters" class="text-caption text-grey-6">
                {{ session.parameters.maxSources }} sources
              </div>
            </div>
          </q-item-section>
          
          <q-item-section side>
            <q-btn
              v-if="session.reportId"
              flat
              round
              icon="description"
              @click.stop="viewReport(session.reportId)"
            >
              <q-tooltip>View Report</q-tooltip>
            </q-btn>
            <q-btn
              v-else-if="canRetry(session)"
              flat
              round
              icon="refresh"
              @click.stop="retrySession(session)"
            >
              <q-tooltip>Retry Research</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
      
      <div v-else class="q-pa-xl text-center text-grey-6">
        <q-icon name="history" size="80px" color="grey-4" />
        <div class="text-h6 q-mt-md">No Research History</div>
        <div class="text-body1">
          {{ searchQuery || statusFilter ? 'No sessions match your filters.' : 'Start your first research to see it here.' }}
        </div>
      </div>
      
      <q-separator v-if="totalPages > 1" />
      
      <q-card-section v-if="totalPages > 1">
        <div class="row justify-center">
          <q-pagination
            v-model="currentPage"
            :max="totalPages"
            :max-pages="7"
            direction-links
            boundary-links
            color="primary"
            active-design="unelevated"
            active-color="primary"
            active-text-color="white"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResearchStore } from '../../stores/research';
import type { ResearchSession } from '../../types/research';

const router = useRouter();
const $q = useQuasar();
const researchStore = useResearchStore();

const loading = ref(false);
const searchQuery = ref('');
const statusFilter = ref<string | null>(null);
const sortBy = ref('createdAt');
const currentPage = ref(1);
const itemsPerPage = 10;

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'In Progress', value: 'active' }
];

const sortOptions = [
  { label: 'Created Date', value: 'createdAt' },
  { label: 'Completed Date', value: 'completedAt' },
  { label: 'Topic', value: 'topic' },
  { label: 'Status', value: 'status' }
];

const allSessions = computed(() => {
  const sessions = [
    ...Array.from(researchStore.activeSessions.values()),
    ...researchStore.sessionHistory
  ];
  
  // Remove duplicates
  const uniqueSessions = new Map<string, ResearchSession>();
  sessions.forEach(session => {
    uniqueSessions.set(session.id, session);
  });
  
  return Array.from(uniqueSessions.values());
});

const filteredSessions = computed(() => {
  let sessions = [...allSessions.value];
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    sessions = sessions.filter(session => 
      session.topic.toLowerCase().includes(query)
    );
  }
  
  // Apply status filter
  if (statusFilter.value) {
    if (statusFilter.value === 'active') {
      sessions = sessions.filter(session => 
        ['pending', 'planning', 'researching', 'analyzing', 'writing'].includes(session.status)
      );
    } else {
      sessions = sessions.filter(session => session.status === statusFilter.value);
    }
  }
  
  // Apply sorting
  sessions.sort((a, b) => {
    switch (sortBy.value) {
      case 'topic':
        return a.topic.localeCompare(b.topic);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'completedAt':
        const aCompleted = a.completedAt || '0';
        const bCompleted = b.completedAt || '0';
        return bCompleted.localeCompare(aCompleted);
      case 'createdAt':
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
  
  return sessions;
});

const totalPages = computed(() => 
  Math.ceil(filteredSessions.value.length / itemsPerPage)
);

const paginatedSessions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredSessions.value.slice(start, end);
});

onMounted(async () => {
  loading.value = true;
  try {
    await researchStore.fetchSessionHistory();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load research history',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
});

function viewSession(session: ResearchSession) {
  if (session.reportId) {
    router.push(`/reports/${session.reportId}`);
  } else if (isActive(session)) {
    router.push(`/research/active/${session.id}`);
  } else {
    $q.notify({
      type: 'info',
      message: 'This session has no report available',
      position: 'top'
    });
  }
}

function viewReport(reportId: string) {
  router.push(`/reports/${reportId}`);
}

async function retrySession(session: ResearchSession) {
  try {
    const newSession = await researchStore.retryResearch(session.id);
    
    $q.notify({
      type: 'positive',
      message: 'Research restarted successfully',
      position: 'top'
    });
    
    router.push(`/research/active/${newSession.id}`);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to retry research',
      position: 'top'
    });
  }
}

function isActive(session: ResearchSession): boolean {
  return ['pending', 'planning', 'researching', 'analyzing', 'writing'].includes(session.status);
}

function canRetry(session: ResearchSession): boolean {
  return session.status === 'failed' || session.status === 'cancelled';
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    completed: 'check_circle',
    failed: 'error',
    cancelled: 'cancel',
    planning: 'psychology',
    researching: 'search',
    analyzing: 'analytics',
    writing: 'edit_note',
    pending: 'schedule'
  };
  return icons[status] || 'help';
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
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}
</script>