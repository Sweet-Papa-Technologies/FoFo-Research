<template>
  <q-page padding>
    <div class="page-container">
      <div class="text-h4 q-mb-md">
        <q-icon name="science" class="q-mr-sm" size="md" />
        New Research
      </div>
      
      <q-card dark class="card-dark q-mb-lg">
        <q-card-section>
          <div class="text-h6 q-mb-md">Start a New Research Job</div>
          <p class="text-body1">
            Enter a research topic and set optional parameters to begin. The system will search for relevant information, capture website content, and generate a comprehensive report.
          </p>
          
          <research-form 
            :loading="loading" 
            @submit="startResearch" 
          />
        </q-card-section>
      </q-card>
      
      <div class="text-h5 q-mt-xl q-mb-md" v-if="activeJobs.length > 0">
        <q-icon name="pending_actions" class="q-mr-sm" />
        Active Research Jobs
      </div>
      
      <div v-if="activeJobs.length > 0">
        <job-progress-card 
          v-for="job in activeJobs" 
          :key="job.id" 
          :job="job"
          @pause="pauseJob"
          @resume="resumeJob" 
          @cancel="cancelJob"
          @details="showJobDetails"
          @view-report="viewReport"
        />
      </div>
      
      <div v-else-if="!loading && activeTabJobs && !researchStore.error" class="text-center q-mt-xl">
        <q-icon name="check_circle" color="positive" size="4rem" />
        <p class="text-h6 q-mt-md">No active research jobs</p>
        <p class="text-body1">Start a new research job above to get started.</p>
      </div>
      
      <div v-else-if="!loading && researchStore.error" class="text-center q-mt-xl">
        <q-icon name="error" color="negative" size="4rem" />
        <p class="text-h6 q-mt-md">Error Loading Research Jobs</p>
        <p class="text-body1">{{ researchStore.error }}</p>
        <q-btn 
          color="primary" 
          label="Retry" 
          icon="refresh" 
          class="q-mt-md"
          @click="loadJobs" 
        />
      </div>
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
                          
                          <q-separator dark spaced v-if="selectedJob.models?.fallback" />
                          
                          <div v-if="selectedJob.models?.fallback" class="text-subtitle2">Fallback Model</div>
                          <q-list v-if="selectedJob.models?.fallback" dense>
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Provider</q-item-label>
                                <q-item-label>{{ selectedJob.models?.fallback?.provider || 'N/A' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Model</q-item-label>
                                <q-item-label>{{ selectedJob.models?.fallback?.model || 'N/A' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </q-list>
                          
                          <q-separator dark spaced v-if="selectedJob.models?.vision" />
                          
                          <div v-if="selectedJob.models?.vision" class="text-subtitle2">Vision Model</div>
                          <q-list v-if="selectedJob.models?.vision" dense>
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Provider</q-item-label>
                                <q-item-label>{{ selectedJob.models?.vision?.provider || 'N/A' }}</q-item-label>
                              </q-item-section>
                            </q-item>
                            
                            <q-item>
                              <q-item-section>
                                <q-item-label caption>Model</q-item-label>
                                <q-item-label>{{ selectedJob.models?.vision?.model || 'N/A' }}</q-item-label>
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
import ResearchForm from 'components/ResearchForm.vue';
import JobProgressCard from 'components/JobProgressCard.vue';
import StatusBadge from 'components/StatusBadge.vue';
import { ResearchJob, JobStatus } from 'src/components/models';

const $q = useQuasar();
const router = useRouter();
const researchStore = useResearchStore();

const loading = ref(false);
const jobDetailsOpen = ref(false);
const selectedJob = ref<ResearchJob | null>(null);
const activeTabJobs = ref(true);

// Get active jobs from store
const activeJobs = computed(() => 
  researchStore.pendingJobs.concat(researchStore.runningJobs)
);

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
  
  return Math.min(Math.max(combinedProgress, 0), 1);
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

// Start a new research job
async function startResearch(formData: any) {
  loading.value = true;
  
  try {
    const jobId = await researchStore.createJob(formData.topic, formData);
    
    if (jobId) {
      $q.notify({
        type: 'positive',
        message: 'Research job created successfully',
        position: 'top'
      });
      
      // Fetch all jobs to update the list
      await researchStore.fetchJobs();
    } else {
      throw new Error('Failed to create job');
    }
  } catch (error) {
    console.error('Failed to create research job:', error);
    
    $q.notify({
      type: 'negative',
      message: 'Failed to create research job',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
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
/* Component styles are included in global app.scss */
</style>