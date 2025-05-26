<template>
  <div class="report-preview">
    <q-card dark bordered class="report-card card-dark">
      <q-card-section class="report-header bg-gradient">
        <div class="text-h5 q-mb-xs">{{ report.topic }}</div>
        <div class="text-caption">
          Created: {{ createdTimeFormatted }} | Report ID: {{ report.id }}
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md">
        <div class="text-h6 q-mb-sm">Executive Summary</div>
        <p class="q-mb-lg">{{ report.executiveSummary }}</p>

        <div class="text-h6 q-mb-sm">Key Findings</div>
        <q-list dense bordered separator class="rounded-borders q-mb-lg">
          <q-item v-for="(finding, index) in report.keyFindings" :key="index">
            <q-item-section>
              <q-item-label>
                <span class="emoji">🔍</span> {{ finding }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <div class="text-h6 q-mb-sm">Content</div>
        <div v-if="sectionView === 'list'">
          <q-list bordered separator dark class="rounded-borders">
            <q-expansion-item
              v-for="(section, index) in report.sections"
              :key="index"
              :label="section.title"
              :caption="`${section.sources.length} sources`"
              group="sections"
              expand-separator
              header-class="text-primary"
            >
              <q-card dark class="bg-dark-page">
                <q-card-section>
                  <div v-html="formatMarkdown(section.content)"></div>
                </q-card-section>
                <q-separator dark />
                <q-card-section class="text-caption">
                  <div class="text-subtitle2 q-mb-xs">Sources:</div>
                  <q-chip
                    v-for="sourceId in section.sources"
                    :key="sourceId"
                    dense
                    color="primary"
                    text-color="white"
                    clickable
                    @click="showSourceDetails(sourceId)"
                  >
                    {{ getSourceTitle(sourceId) }}
                  </q-chip>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </div>
        <div v-else-if="sectionView === 'full'" class="markdown-content">
          <div v-for="(section, index) in report.sections" :key="index" class="report-section q-mb-xl">
            <div class="text-h6 text-primary">{{ section.title }}</div>
            <div v-html="formatMarkdown(section.content)"></div>
            <div class="text-caption q-mt-md">
              <div class="text-subtitle2 q-mb-xs">Sources:</div>
              <q-chip
                v-for="sourceId in section.sources"
                :key="sourceId"
                dense
                color="primary"
                text-color="white"
                clickable
                @click="showSourceDetails(sourceId)"
              >
                {{ getSourceTitle(sourceId) }}
              </q-chip>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator dark />

      <q-card-section>
        <div class="text-h6 q-mb-sm">Sources</div>
        <q-list bordered separator dense class="rounded-borders">
          <q-item
            v-for="(source, id) in report.sources"
            :key="id"
            clickable
            v-ripple
            @click="openSourceUrl(source.url)"
          >
            <q-item-section>
              <q-item-label>{{ source.title }}</q-item-label>
              <q-item-label caption>{{ source.url }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge 
                color="primary" 
                :label="`${source.credibilityScore ? (source.credibilityScore * 100).toFixed(0) : '??'}%`" 
                title="Credibility Score"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator dark />

      <q-card-actions align="between">
        <div>
          <q-btn-toggle
            v-model="sectionView"
            flat
            toggle-color="primary"
            :options="[
              {label: 'Collapsed', value: 'list'},
              {label: 'Full Content', value: 'full'}
            ]"
          />
        </div>
        <div>
          <q-btn flat color="primary" icon="download" label="Export" @click="$emit('export', report.id)">
            <q-menu>
              <q-list style="min-width: 100px">
                <q-item clickable v-close-popup @click="$emit('export', report.id, 'pdf')">
                  <q-item-section>PDF</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="$emit('export', report.id, 'markdown')">
                  <q-item-section>Markdown</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="$emit('export', report.id, 'html')">
                  <q-item-section>HTML</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-btn flat color="primary" icon="print" label="Print" @click="$emit('print', report.id)" />
        </div>
      </q-card-actions>
    </q-card>

    <!-- Source Details Dialog -->
    <q-dialog v-model="sourceDialogOpen" maximized>
      <q-card dark>
        <q-card-section class="row items-center">
          <div class="text-h6">Source Details</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator dark />

        <q-card-section v-if="selectedSource" class="q-pa-lg">
          <div class="text-h6 q-mb-md">{{ selectedSource.title }}</div>
          <q-badge class="q-mb-md" color="primary" :label="`Credibility: ${selectedSource.credibilityScore ? (selectedSource.credibilityScore * 100).toFixed(0) : '??'}%`" />
          
          <q-list dense class="q-mb-md">
            <q-item>
              <q-item-section>
                <q-item-label overline>URL</q-item-label>
                <q-item-label>
                  <a :href="selectedSource.url" target="_blank" class="text-primary">{{ selectedSource.url }}</a>
                </q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label overline>Captured On</q-item-label>
                <q-item-label>{{ formatDate(selectedSource.captureTimestamp) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="text-h6 q-mb-md">Summary</div>
          <div class="source-summary q-pa-md bg-dark-page rounded-borders">{{ selectedSource.summary }}</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Report, SourceInfo } from 'src/components/models';

const props = defineProps<{
  report: Report;
}>();

const emit = defineEmits<{
  (e: 'export', reportId: string, format?: string): void;
  (e: 'print', reportId: string): void;
}>();

const sectionView = ref('list');
const sourceDialogOpen = ref(false);
const selectedSource = ref<SourceInfo | null>(null);

const createdTimeFormatted = computed(() => {
  return formatDate(props.report.createdAt);
});

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

function formatMarkdown(content: string): string {
  // For a real implementation, use a markdown library
  // This is a very simplified version
  let formatted = content
    .replace(/\n\n/g, '<br><br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n- /g, '<br>• ');
  
  return formatted;
}

function getSourceTitle(sourceId: string): string {
  const source = props.report.sources[sourceId];
  if (!source) return 'Unknown Source';
  
  // Truncate long titles
  return source.title.length > 20 
    ? source.title.substring(0, 20) + '...'
    : source.title;
}

function showSourceDetails(sourceId: string): void {
  const source = props.report.sources[sourceId];
  if (source) {
    selectedSource.value = source;
    sourceDialogOpen.value = true;
  }
}

function openSourceUrl(url: string): void {
  window.open(url, '_blank');
}
</script>

<style scoped>
.report-card {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.report-header {
  background: linear-gradient(135deg, var(--q-primary), var(--q-secondary));
  color: white;
  padding: 20px;
}

.source-summary {
  line-height: 1.6;
  white-space: pre-line;
}

.report-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 20px;
}
</style>