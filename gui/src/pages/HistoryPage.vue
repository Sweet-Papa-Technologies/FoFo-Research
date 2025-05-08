<template>
  <q-page padding>
    <div class="page-container">
      <div class="text-h4 q-mb-md">
        <q-icon name="history" class="q-mr-sm" size="md" />
        Research History
      </div>
      
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
        <div class="text-subtitle1 q-ml-md">Loading history...</div>
      </div>
      
      <!-- Job history -->
      <template v-else>
        <div v-if="allJobs.length > 0">
          <!-- Search and filters -->
          <div class="q-mb-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model="searchQuery"
                  filled
                  dark
                  placeholder="Search jobs by topic..."
                  clearable
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
                  filled
                  dark
                  dense
                  emit-value
                  map-options
                  label="Status"
                >
                  <template v-slot:prepend>
                    <q-icon name="filter_list" />
                  </template>
                </q-select>
              </div>
              
              <div class="col-12 col-md-3">
                <q-select
                  v-model="sortBy"
                  :options="sortOptions"
                  filled
                  dark
                  dense
                  emit-value
                  map-options
                  label="Sort by"
                >
                  <template v-slot:prepend>
                    <q-icon name="sort" />
                  </template>
                </q-select>
              </div>
            </div>
          </div>
          
          <!-- Job table -->
          <q-card dark bordered class="card-dark history-table">
            <q-table
              :rows="filteredAndSortedJobs"
              :columns="columns"
              row-key="id"
              dark
              flat
              :pagination="initialPagination"
              :loading="loading"
              binary-state-sort
            >
              <!-- Status column -->
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <status-badge :status="props.value" />
                </q-td>
              </template>
              
              <!-- Progress column -->
              <template v-slot:body-cell-progress="props">
                <q-td :props="props">
                  <div class="progress-container">
                    <q-linear-progress
                      :value="getProgressValue(props.row)"
                      :color="getProgressColor(props.row)"
                      size="md"
                      rounded
                      stripe
                      :animate="props.row.status === 'running'"
                      class="q-mb-xs"
                    />
                    <div class="text-caption">
                      {{ getProgressText(props.row) }}
                    </div>
                  </div>
                </q-td>
              </template>
              
              <!-- Created date column -->
              <template v-slot:body-cell-createdAt="props">
                <q-td :props="props">
                  {{ formatDate(props.value) }}
                </q-td>
              </template>
              
              <!-- Completed date column -->
              <template v-slot:body-cell-completedAt="props">
                <q-td :props="props">
                  {{ props.value ? formatDate(props.value) : '—' }}
                </q-td>
              </template>
              
              <!-- Actions column -->
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <div class="row no-wrap justify-center">
                    <q-btn
                      v-if="props.row.status === 'running'"
                      dense
                      flat
                      round
                      color="warning"
                      icon="pause"
                      @click="pauseJob(props.row.id)"
                    >
                      <q-tooltip>Pause Job</q-tooltip>
                    </q-btn>
                    
                    <q-btn
                      v-if="props.row.status === 'paused'"
                      dense
                      flat
                      round
                      color="primary"
                      icon="play_arrow"
                      @click="resumeJob(props.row.id)"
                    >
                      <q-tooltip>Resume Job</q-tooltip>
                    </q-btn>
                    
                    <q-btn
                      v-if="['pending', 'running', 'paused'].includes(props.row.status)"
                      dense
                      flat
                      round
                      color="negative"
                      icon="cancel"
                      @click="cancelJob(props.row.id)"
                    >
                      <q-tooltip>Cancel Job</q-tooltip>
                    </q-btn>
                    
                    <q-btn
                      dense
                      flat
                      round
                      color="primary"
                      icon="info"
                      @click="showJobDetails(props.row.id)"
                    >
                      <q-tooltip>View Details</q-tooltip>
                    </q-btn>
                    
                    <q-btn
                      v-if="props.row.status === 'completed' && props.row.reportId"
                      dense
                      flat
                      round
                      color="positive"
                      icon="visibility"
                      @click="viewReport(props.row.reportId)"
                    >
                      <q-tooltip>View Report</q-tooltip>
                    </q-btn>
                  </div>
                </q-td>
              </template>
              
              <!-- No data -->
              <template v-slot:no-data>
                <div class="full-width text-center q-pa-lg">
                  <div v-if="researchStore.error">
                    <q-icon name="error" size="2rem" color="negative" />
                    <div class="text-subtitle1 q-mt-sm">Error loading jobs: {{ researchStore.error }}</div>
                    <q-btn 
                      color="primary" 
                      label="Retry" 
                      icon="refresh" 
                      class="q-mt-sm"
                      @click="loadJobs" 
                      :loading="loading"
                    />
                  </div>
                  <div v-else>
                    <q-icon name="search_off" size="2rem" color="grey-7" />
                    <div class="text-subtitle1 q-mt-sm">No matching jobs found</div>
                  </div>
                </div>
              </template>
            </q-table>
          </q-card>
        </div>
        
        <!-- Empty state -->
        <div v-else-if="!researchStore.error" class="text-center q-mt-xl">
          <q-icon name="history" color="grey-7" size="4rem" />
          <p class="text-h6 q-mt-md">No research history</p>
          <p class="text-body1">
            Start a new research job to view your history.
          </p>
          <q-btn 
            color="primary" 
            label="Start New Research" 
            icon="science" 
            class="q-mt-md"
            @click="$router.push('/research/new')"
          />
        </div>
        
        <!-- Error state -->
        <div v-else class="text-center q-mt-xl">
          <q-icon name="error" color="negative" size="4rem" />
          <p class="text-h6 q-mt-md">Error Loading Research Jobs</p>
          <p class="text-body1">{{ researchStore.error }}</p>
          <q-btn 
            color="primary" 
            label="Retry" 
            icon="refresh" 
            class="q-mt-md"
            @click="loadJobs" 
            :loading="loading"
          />
        </div>
      </template>
    </div>
    
    <!-- Job Details Dialog -->
    <q-dialog v-model="jobDetailsOpen" maximized>
      <q-card dark>
        <q-card-section class="row items-center">
          <div class="text-h6">Job Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-separator dark />
        
        <q-card-section v-if="selectedJob" class="q-pa-md scroll" style="max-height: 80vh">
          <div class="row q-col-gutter-lg">
            <div class="col-12 col-md-6">
              <q-card dark bordered flat class="card-dark">
                <q-card-section>
                  <div class="text-h6">General Information</div>
                  <q-separator dark class="q-my-md" />
                  
                  <q-list dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Topic</q-item-label>
                        <q-item-label>{{ selectedJob.topic }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Status</q-item-label>
                        <q-item-label>
                          <status-badge :status="selectedJob.status" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Created</q-item-label>
                        <q-item-label>{{ formatDate(selectedJob.createdAt) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    
                    <q-item v-if="selectedJob.updatedAt">
                      <q-item-section>
                        <q-item-label caption>Last Updated</q-item-label>
                        <q-item-label>{{ formatDate(selectedJob.updatedAt) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    
                    <q-item v-if="selectedJob.completedAt">
                      <q-item-section>
                        <q-item-label caption>Completed</q-item-label>
                        <q-item-label>{{ formatDate(selectedJob.completedAt) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
              
              <q-card dark bordered flat class="card-dark q-mt-md">
                <q-card-section>
                  <div class="text-h6">Progress</div>
                  <q-separator dark class="q-my-md" />
                  
                  <q-linear-progress
                    :value="getProgressValue(selectedJob)"
                    :color="getProgressColor(selectedJob)"
                    size="md"
                    rounded
                    stripe
                    :animate="selectedJob.status === 'running'"
                    class="q-mb-md"
                  />
                  
                  <q-list dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Processed URLs</q-item-label>
                        <q-item-label>{{ selectedJob.progress?.processedUrls || 0 }} / {{ selectedJob.progress?.totalUrls || 0 }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Current Iteration</q-item-label>
                        <q-item-label>{{ selectedJob.progress?.currentIteration || 0 }} / {{ selectedJob.config?.maxIterations || 5 }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
            
            <div class="col-12 col-md-6">
              <q-card dark bordered flat class="card-dark">
                <q-card-section>
                  <div class="text-h6">Configuration</div>
                  <q-separator dark class="q-my-md" />
                  
                  <q-list dense>
                    <q-expansion-item
                      group="config"
                      icon="settings"
                      label="Research Settings"
                      header-class="text-primary"
                      expand-separator
                    >
                      <q-card>
                        <q-card-section>
                          <q-list dense>
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Max Iterations</q-item-label>
                                <q-item-label>{{ selectedJob.config?.maxIterations || 5 }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Max Parallel Searches</q-item-label>
                                <q-item-label>{{ selectedJob.config?.maxParallelSearches || 10 }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Follow Links</q-item-label>
                                <q-item-label>{{ selectedJob.config?.followLinks ? 'Yes' : 'No' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item v-if="selectedJob.config?.followLinks">
                              <q-item-section>
                                <q-item-label caption>Max Links Per Page</q-item-label>
                                <q-item-label>{{ selectedJob.config?.maxLinksPerPage || 3 }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </q-list>
                        </q-card-section>
                      </q-card>
                    </q-expansion-item>
                    
                    <q-expansion-item
                      group="config"
                      icon="search"
                      label="Search Settings"
                      header-class="text-primary"
                      expand-separator
                    >
                      <q-card>
                        <q-card-section>
                          <q-list dense>
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Search Engine</q-item-label>
                                <q-item-label>{{ selectedJob.search?.engine || 'duckduckgo' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Results Per Query</q-item-label>
                                <q-item-label>{{ selectedJob.search?.resultsPerQuery || 8 }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-expansion-item
                              dense
                              label="Domain Filters"
                              caption="Include/exclude domains"
                            >
                              <q-card>
                                <q-card-section>
                                  <div class="text-subtitle2">Include Domains</div>
                                  <div v-if="selectedJob.search?.domainFilters?.include?.length">
                                    <q-chip
                                      v-for="(domain, index) in selectedJob.search.domainFilters.include"
                                      :key="`include-${index}`"
                                      dense
                                      color="primary"
                                      text-color="white"
                                    >
                                      {{ domain }}
                                    </q-chip>
                                  </div>
                                  <div v-else class="text-caption">No domains included</div>
                                  
                                  <div class="text-subtitle2 q-mt-sm">Exclude Domains</div>
                                  <div v-if="selectedJob.search?.domainFilters?.exclude?.length">
                                    <q-chip
                                      v-for="(domain, index) in selectedJob.search.domainFilters.exclude"
                                      :key="`exclude-${index}`"
                                      dense
                                      color="negative"
                                      text-color="white"
                                    >
                                      {{ domain }}
                                    </q-chip>
                                  </div>
                                  <div v-else class="text-caption">No domains excluded</div>
                                </q-card-section>
                              </q-card>
                            </q-expansion-item>
                          </q-list>
                        </q-card-section>
                      </q-card>
                    </q-expansion-item>
                    
                    <q-expansion-item
                      group="config"
                      icon="smart_toy"
                      label="Model Settings"
                      header-class="text-primary"
                      expand-separator
                    >
                      <q-card>
                        <q-card-section>
                          <div class="text-subtitle2">Primary Model</div>
                          <q-list dense>
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Provider</q-item-label>
                                <q-item-label>{{ selectedJob.models?.primary?.provider || 'N/A' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Model</q-item-label>
                                <q-item-label>{{ selectedJob.models?.primary?.model || 'N/A' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Temperature</q-item-label>
                                <q-item-label>{{ selectedJob.models?.primary?.temperature || 'N/A' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </q-list>
                        </q-card-section>
                      </q-card>
                    </q-expansion-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
        
        <q-separator dark />
        
        <q-card-actions align="right">
          <q-btn 
            v-if="selectedJob?.status === 'running'" 
            flat 
            color="warning" 
            icon="pause" 
            label="Pause" 
            @click="pauseJob(selectedJob.id)" 
          />
          <q-btn 
            v-if="selectedJob?.status === 'paused'" 
            flat 
            color="primary" 
            icon="play_arrow" 
            label="Resume" 
            @click="resumeJob(selectedJob.id)" 
          />
          <q-btn 
            v-if="selectedJob?.status === 'completed'" 
            flat 
            color="positive" 
            icon="visibility" 
            label="View Report" 
            @click="viewReport(selectedJob?.reportId)" 
            :disable="!selectedJob?.reportId"
          />
          <q-btn 
            v-if="['pending', 'running', 'paused'].includes(selectedJob?.status || '')" 
            flat 
            color="negative" 
            icon="cancel" 
            label="Cancel" 
            @click="cancelJob(selectedJob?.id || '')" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResearchStore } from 'src/stores';
import StatusBadge from 'components/StatusBadge.vue';
import { ResearchJob, JobStatus } from 'src/components/models';

const $q = useQuasar();
const router = useRouter();
const researchStore = useResearchStore();

const loading = ref(true);
const searchQuery = ref('');
const statusFilter = ref('all');
const sortBy = ref('createdAt-desc');
const jobDetailsOpen = ref(false);
const selectedJob = ref<ResearchJob | null>(null);

// Table columns
const columns = [
  {
    name: 'topic',
    required: true,
    label: 'Topic',
    align: 'left',
    field: 'topic',
    sortable: true
  },
  {
    name: 'status',
    required: true,
    label: 'Status',
    align: 'center',
    field: 'status',
    sortable: true
  },
  {
    name: 'progress',
    required: true,
    label: 'Progress',
    align: 'center',
    field: 'progress'
  },
  {
    name: 'createdAt',
    required: true,
    label: 'Created',
    align: 'center',
    field: 'createdAt',
    sortable: true
  },
  {
    name: 'completedAt',
    required: false,
    label: 'Completed',
    align: 'center',
    field: 'completedAt',
    sortable: true
  },
  {
    name: 'actions',
    required: true,
    label: 'Actions',
    align: 'center',
    field: 'actions'
  }
];

// Initial pagination
const initialPagination = {
  rowsPerPage: 10
};

// Filter and sort options
const statusOptions = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Running', value: 'running' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' }
];

const sortOptions = [
  { label: 'Newest First', value: 'createdAt-desc' },
  { label: 'Oldest First', value: 'createdAt-asc' },
  { label: 'Topic A-Z', value: 'topic-asc' },
  { label: 'Topic Z-A', value: 'topic-desc' }
];

// Get all jobs from store
const allJobs = computed(() => researchStore.getAllJobs());

// Filter and sort jobs
const filteredAndSortedJobs = computed(() => {
  let result = [...allJobs.value];
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(job => 
      job.topic.toLowerCase().includes(query)
    );
  }
  
  // Apply status filter
  if (statusFilter.value !== 'all') {
    result = result.filter(job => job.status === statusFilter.value);
  }
  
  // Apply sorting
  const [sortField, sortOrder] = sortBy.value.split('-');
  
  result.sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'completedAt') {
      // Handle null completedAt values
      if (!a.completedAt && !b.completedAt) {
        comparison = 0;
      } else if (!a.completedAt) {
        comparison = 1;
      } else if (!b.completedAt) {
        comparison = -1;
      } else {
        comparison = new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      }
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

// Calculate progress value for the progress bar
function getProgressValue(job: ResearchJob): number {
  if (!job.progress || !job.progress.totalUrls) {
    return 0;
  }
  
  // Progress based on processed URLs and iterations
  const urlProgress = job.progress.processedUrls / job.progress.totalUrls;
  const iterationProgress = job.progress.currentIteration / (job.config?.maxIterations || 5);
  
  // Weighted average (70% URL progress, 30% iteration progress)
  const combinedProgress = urlProgress * 0.7 + iterationProgress * 0.3;
  
  // If job is completed, return 1 (100%)
  if (job.status === JobStatus.COMPLETED) {
    return 1;
  }
  
  return Math.min(Math.max(combinedProgress, 0), 1);
}

// Get progress text
function getProgressText(job: ResearchJob): string {
  const progressPercent = Math.round(getProgressValue(job) * 100);
  
  if (job.status === JobStatus.COMPLETED) {
    return 'Completed';
  }
  
  if (job.status === JobStatus.FAILED) {
    return 'Failed';
  }
  
  return `${progressPercent}% - ${job.progress?.processedUrls || 0}/${job.progress?.totalUrls || 0} URLs`;
}

// Determine progress bar color based on job status
function getProgressColor(job: ResearchJob): string {
  if (job.status === JobStatus.COMPLETED) {
    return 'positive';
  }
  if (job.status === JobStatus.FAILED) {
    return 'negative';
  }
  if (job.status === JobStatus.PAUSED) {
    return 'warning';
  }
  return 'primary';
}

// Pause a running job
async function pauseJob(jobId: string) {
  try {
    const success = await researchStore.pauseJob(jobId);
    
    if (success) {
      $q.notify({
        type: 'info',
        message: `Job ${jobId} paused`,
        position: 'top'
      });
    } else {
      throw new Error('Failed to pause job');
    }
  } catch (error) {
    console.error(`Failed to pause job ${jobId}:`, error);
    
    $q.notify({
      type: 'negative',
      message: `Failed to pause job ${jobId}`,
      position: 'top'
    });
  }
}

// Resume a paused job
async function resumeJob(jobId: string) {
  try {
    const success = await researchStore.resumeJob(jobId);
    
    if (success) {
      $q.notify({
        type: 'info',
        message: `Job ${jobId} resumed`,
        position: 'top'
      });
    } else {
      throw new Error('Failed to resume job');
    }
  } catch (error) {
    console.error(`Failed to resume job ${jobId}:`, error);
    
    $q.notify({
      type: 'negative',
      message: `Failed to resume job ${jobId}`,
      position: 'top'
    });
  }
}

// Cancel a job
async function cancelJob(jobId: string) {
  try {
    const success = await researchStore.cancelJob(jobId);
    
    if (success) {
      $q.notify({
        type: 'warning',
        message: `Job ${jobId} cancelled`,
        position: 'top'
      });
      
      // Close the details dialog if open
      if (jobDetailsOpen.value && selectedJob.value?.id === jobId) {
        jobDetailsOpen.value = false;
      }
    } else {
      throw new Error('Failed to cancel job');
    }
  } catch (error) {
    console.error(`Failed to cancel job ${jobId}:`, error);
    
    $q.notify({
      type: 'negative',
      message: `Failed to cancel job ${jobId}`,
      position: 'top'
    });
  }
}

// View job details
function showJobDetails(jobId: string) {
  const job = researchStore.getJobById(jobId);
  
  if (job) {
    selectedJob.value = job;
    jobDetailsOpen.value = true;
  } else {
    $q.notify({
      type: 'negative',
      message: 'Job not found',
      position: 'top'
    });
  }
}

// View a report
function viewReport(reportId?: string) {
  if (reportId) {
    router.push({ name: 'report-detail', params: { id: reportId } });
  }
}

// Function to load jobs (used in mounted and retry button)
async function loadJobs() {
  loading.value = true;
  
  try {
    // Load jobs from store using real API
    await researchStore.fetchJobs();
  } catch (error) {
    console.error('Failed to load jobs:', error);
    
    $q.notify({
      type: 'negative',
      message: 'Failed to load research jobs',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadJobs();
});
</script>

<style scoped>
.history-table {
  border-radius: 8px;
  overflow: hidden;
}

.progress-container {
  width: 100%;
  min-width: 150px;
}
</style>