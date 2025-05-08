<template>
  <q-page padding>
    <div class="page-container">
      <div class="text-h4 q-mb-md">
        <q-icon name="summarize" class="q-mr-sm" size="md" />
        Research Reports
      </div>
      
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
        <div class="text-subtitle1 q-ml-md">Loading reports...</div>
      </div>
      
      <!-- Reports list -->
      <template v-else>
        <div v-if="reports.length > 0">
          <!-- Search and filters -->
          <div class="q-mb-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="searchQuery"
                  filled
                  dark
                  placeholder="Search reports by topic..."
                  clearable
                  class="report-search"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              
              <div class="col-12 col-md-6">
                <q-select
                  v-model="sortBy"
                  :options="sortOptions"
                  filled
                  dark
                  dense
                  emit-value
                  map-options
                  label="Sort by"
                  class="report-sort"
                >
                  <template v-slot:prepend>
                    <q-icon name="sort" />
                  </template>
                </q-select>
              </div>
            </div>
          </div>
          
          <!-- Reports grid -->
          <div class="row q-col-gutter-lg">
            <div 
              v-for="report in filteredAndSortedReports" 
              :key="report.id"
              class="col-12 col-md-6 col-lg-4"
            >
              <q-card dark bordered class="report-card card-dark">
                <q-card-section class="report-header bg-gradient">
                  <div class="text-h6 ellipsis">{{ report.topic }}</div>
                  <div class="text-caption q-mt-xs">
                    Created: {{ formatDate(report.createdAt) }}
                  </div>
                </q-card-section>
                
                <q-card-section>
                  <div class="text-subtitle2 q-mb-xs">Key Findings</div>
                  <q-list dense>
                    <q-item v-for="(finding, index) in report.keyFindings.slice(0, 3)" :key="index" dense>
                      <q-item-section avatar>
                        <q-icon name="check_circle" color="positive" />
                      </q-item-section>
                      <q-item-section class="ellipsis">
                        <q-tooltip>{{ finding }}</q-tooltip>
                        {{ finding }}
                      </q-item-section>
                    </q-item>
                    
                    <q-item v-if="report.keyFindings.length > 3" dense>
                      <q-item-section avatar>
                        <q-icon name="more_horiz" />
                      </q-item-section>
                      <q-item-section>
                        {{ report.keyFindings.length - 3 }} more findings...
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
                
                <q-separator dark inset />
                
                <q-card-section class="report-stats row items-center">
                  <div class="col-6">
                    <div class="text-caption">Sources</div>
                    <div class="text-h6">{{ Object.keys(report.sources).length }}</div>
                  </div>
                  
                  <div class="col-6">
                    <div class="text-caption">Sections</div>
                    <div class="text-h6">{{ report.sections.length }}</div>
                  </div>
                </q-card-section>
                
                <q-card-actions align="right">
                  <q-btn flat color="primary" icon="open_in_new" label="View" @click="viewReport(report.id)" />
                  <q-btn flat color="primary" icon="download">
                    <q-menu>
                      <q-list style="min-width: 100px">
                        <q-item clickable v-close-popup @click="exportReport(report.id, 'pdf')">
                          <q-item-section>PDF</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="exportReport(report.id, 'markdown')">
                          <q-item-section>Markdown</q-item-section>
                        </q-item>
                        <q-item clickable v-close-popup @click="exportReport(report.id, 'html')">
                          <q-item-section>HTML</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-card-actions>
              </q-card>
            </div>
          </div>
        </div>
        
        <!-- Empty state -->
        <div v-else class="text-center q-mt-xl">
          <q-icon name="description" color="grey-7" size="4rem" />
          <p class="text-h6 q-mt-md">No reports found</p>
          <p class="text-body1">
            Start a new research job to generate reports.
          </p>
          <q-btn 
            color="primary" 
            label="Start New Research" 
            icon="science" 
            class="q-mt-md"
            @click="$router.push('/research/new')"
          />
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useReportStore } from 'src/stores';

const $q = useQuasar();
const router = useRouter();
const reportStore = useReportStore();

const loading = ref(true);
const searchQuery = ref('');
const sortBy = ref('createdAt-desc');

const sortOptions = [
  { label: 'Newest First', value: 'createdAt-desc' },
  { label: 'Oldest First', value: 'createdAt-asc' },
  { label: 'Topic A-Z', value: 'topic-asc' },
  { label: 'Topic Z-A', value: 'topic-desc' }
];

// Get reports from store
const reports = computed(() => reportStore.allReports);

// Filter and sort reports
const filteredAndSortedReports = computed(() => {
  let result = [...reports.value];
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(report => 
      report.topic.toLowerCase().includes(query) ||
      report.keyFindings.some(finding => finding.toLowerCase().includes(query)) ||
      report.executiveSummary.toLowerCase().includes(query)
    );
  }
  
  // Apply sorting
  const [sortField, sortOrder] = sortBy.value.split('-');
  
  result.sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'topic') {
      comparison = a.topic.localeCompare(b.topic);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return result;
});

// Format date
function formatDate(date: Date | string): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

// View a report
function viewReport(reportId: string) {
  router.push({ name: 'report-detail', params: { id: reportId } });
}

// Export a report
function exportReport(reportId: string, format: string) {
  // In development mode, this will not actually export the report
  $q.notify({
    type: 'info',
    message: `Exporting report as ${format.toUpperCase()}`,
    position: 'top'
  });
}

onMounted(async () => {
  loading.value = true;
  
  try {
    // Load reports from store
    await reportStore._mockFetchReports();
  } catch (error) {
    console.error('Failed to load reports:', error);
    
    $q.notify({
      type: 'negative',
      message: 'Failed to load reports',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.report-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.report-header {
  background: linear-gradient(135deg, var(--q-primary), var(--q-secondary));
  color: white;
}

.report-stats {
  background-color: rgba(0, 0, 0, 0.1);
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>