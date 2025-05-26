<template>
  <q-page padding>
    <div class="page-container">
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
        <div class="text-subtitle1 q-ml-md">Loading report...</div>
      </div>
      
      <!-- Report not found -->
      <div v-else-if="!report" class="text-center q-mt-xl">
        <q-icon name="error_outline" color="negative" size="4rem" />
        <p class="text-h6 q-mt-md">Report not found</p>
        <p class="text-body1">
          The requested report could not be found or may have been deleted.
        </p>
        <q-btn 
          color="primary" 
          label="Back to Reports" 
          icon="arrow_back" 
          class="q-mt-md"
          @click="$router.push('/reports')"
        />
      </div>
      
      <!-- Report content -->
      <template v-else>
        <div class="q-mb-md">
          <q-btn 
            flat 
            color="primary" 
            icon="arrow_back" 
            label="Back to Reports" 
            @click="$router.push('/reports')"
          />
        </div>
        
        <report-preview 
          :report="report" 
          @export="exportReport" 
          @print="printReport"
        />
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useReportStore } from 'src/stores';
import { Report } from 'src/components/models';
import ReportPreview from 'components/ReportPreview.vue';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const reportStore = useReportStore();

const loading = ref(true);
const report = ref<Report | null>(null);

// Export a report
function exportReport(reportId: string, format: string = 'pdf') {
  // In development mode, this will not actually export the report
  $q.notify({
    type: 'info',
    message: `Exporting report as ${format.toUpperCase()}`,
    position: 'top'
  });
}

// Print a report
function printReport(reportId: string) {
  // In development mode, this will not actually print the report
  $q.notify({
    type: 'info',
    message: 'Preparing report for printing',
    position: 'top'
  });
  
  // In a real implementation, we would either:
  // 1. Use window.print() to print the current page
  // 2. Open a new window with a print-friendly version of the report
}

onMounted(async () => {
  loading.value = true;
  
  try {
    const reportId = route.params.id as string;
    
    if (!reportId) {
      throw new Error('Report ID is required');
    }
    
    // Load report from store
    const loadedReport = await reportStore._mockFetchReportById(reportId);
    report.value = loadedReport;
    
    if (!loadedReport) {
      $q.notify({
        type: 'negative',
        message: 'Report not found',
        position: 'top'
      });
    }
  } catch (error) {
    console.error('Failed to load report:', error);
    
    $q.notify({
      type: 'negative',
      message: 'Failed to load report',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* Component styles are included in global app.scss */
</style>