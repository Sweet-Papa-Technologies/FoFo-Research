<template>
  <q-page padding>
    <div class="page-container">
      <div class="text-h4 q-mb-md">
        <q-icon name="settings" class="q-mr-sm" size="md" />
        Settings
      </div>
      
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
        <div class="text-subtitle1 q-ml-md">Loading settings...</div>
      </div>
      
      <!-- Settings content -->
      <template v-else>
        <q-card dark bordered class="card-dark q-mb-lg">
          <q-tabs
            v-model="activeTab"
            dense
            class="text-primary"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
          >
            <q-tab name="general" icon="tune" label="General" />
            <q-tab name="models" icon="smart_toy" label="Models" />
            <q-tab name="search" icon="search" label="Search" />
            <q-tab name="system" icon="memory" label="System" />
          </q-tabs>
          
          <q-separator dark />
          
          <q-tab-panels v-model="activeTab" animated class="bg-dark">
            <!-- General Settings -->
            <q-tab-panel name="general">
              <div class="text-h6 q-mb-md">General Settings</div>
              
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-card dark flat bordered class="bg-dark-page">
                    <q-card-section>
                      <div class="text-subtitle1">Research Configuration</div>
                      <q-separator dark class="q-my-md" />
                      
                      <q-list dense>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Max Iterations</q-item-label>
                            <q-item-label caption>Number of research cycles to perform</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-slider
                              v-model="settings.research.maxIterations"
                              :min="1"
                              :max="10"
                              :step="1"
                              label
                              class="q-mr-md"
                              style="width: 120px"
                            />
                          </q-item-section>
                          <q-item-section side style="width: 40px">
                            <q-badge color="primary">{{ settings.research.maxIterations }}</q-badge>
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Max Parallel Searches</q-item-label>
                            <q-item-label caption>Number of concurrent web searches</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-slider
                              v-model="settings.research.maxParallelSearches"
                              :min="1"
                              :max="20"
                              :step="1"
                              label
                              class="q-mr-md"
                              style="width: 120px"
                            />
                          </q-item-section>
                          <q-item-section side style="width: 40px">
                            <q-badge color="primary">{{ settings.research.maxParallelSearches }}</q-badge>
                          </q-item-section>
                        </q-item>
                        
                        <q-item tag="label">
                          <q-item-section>
                            <q-item-label>Follow Links</q-item-label>
                            <q-item-label caption>Follow relevant links from search results</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-toggle v-model="settings.research.followLinks" color="primary" />
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Max Links Per Page</q-item-label>
                            <q-item-label caption>Maximum number of links to follow from each page</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-slider
                              v-model="settings.research.maxLinksPerPage"
                              :min="1"
                              :max="10"
                              :step="1"
                              label
                              class="q-mr-md"
                              :disable="!settings.research.followLinks"
                              style="width: 120px"
                            />
                          </q-item-section>
                          <q-item-section side style="width: 40px">
                            <q-badge :color="settings.research.followLinks ? 'primary' : 'grey'">
                              {{ settings.research.maxLinksPerPage }}
                            </q-badge>
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Information Gain Threshold</q-item-label>
                            <q-item-label caption>Threshold for determining when to stop research</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-slider
                              v-model="settings.research.informationGainThreshold"
                              :min="0.1"
                              :max="0.5"
                              :step="0.05"
                              label
                              class="q-mr-md"
                              style="width: 120px"
                            />
                          </q-item-section>
                          <q-item-section side style="width: 40px">
                            <q-badge color="primary">{{ settings.research.informationGainThreshold.toFixed(2) }}</q-badge>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
                
                <div class="col-12 col-md-6">
                  <q-card dark flat bordered class="bg-dark-page">
                    <q-card-section>
                      <div class="text-subtitle1">Report Configuration</div>
                      <q-separator dark class="q-my-md" />
                      
                      <q-list dense>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Default Report Format</q-item-label>
                            <q-item-label caption>Format for exporting reports</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-select
                              v-model="settings.reporting.format"
                              :options="reportFormatOptions"
                              dense
                              options-dense
                              outlined
                              class="settings-select"
                            />
                          </q-item-section>
                        </q-item>
                        
                        <q-item tag="label">
                          <q-item-section>
                            <q-item-label>Include Sources</q-item-label>
                            <q-item-label caption>Include source information in reports</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-toggle
                              v-model="settings.reporting.includeSources"
                              color="primary"
                            />
                          </q-item-section>
                        </q-item>
                        
                        <q-item tag="label">
                          <q-item-section>
                            <q-item-label>Summarize Sources</q-item-label>
                            <q-item-label caption>Include summaries of sources in reports</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-toggle
                              v-model="settings.reporting.summarizeSources"
                              color="primary"
                              :disable="!settings.reporting.includeSources"
                            />
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Max Report Length</q-item-label>
                            <q-item-label caption>Maximum length of generated reports</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-select
                              v-model="settings.reporting.maxReportLength"
                              :options="reportLengthOptions"
                              dense
                              options-dense
                              outlined
                              class="settings-select"
                            />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                  
                  <q-card dark flat bordered class="bg-dark-page q-mt-md">
                    <q-card-section>
                      <div class="text-subtitle1">Interface Settings</div>
                      <q-separator dark class="q-my-md" />
                      
                      <q-list dense>
                        <q-item tag="label">
                          <q-item-section>
                            <q-item-label>Dark Theme</q-item-label>
                            <q-item-label caption>Enable dark theme for the application</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-toggle
                              v-model="darkMode"
                              color="primary"
                              @update:model-value="toggleDarkMode"
                            />
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Language</q-item-label>
                            <q-item-label caption>Application display language</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-select
                              v-model="selectedLanguage"
                              :options="languageOptions"
                              dense
                              options-dense
                              outlined
                              class="settings-select"
                            />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-tab-panel>
            
            <!-- Model Settings -->
            <q-tab-panel name="models">
              <div class="text-h6 q-mb-md">Model Settings</div>
              
              <q-tabs
                v-model="activeModelTab"
                dense
                class="text-primary"
                align="left"
                narrow-indicator
              >
                <q-tab name="primary" label="Primary Model" />
                <q-tab name="fallback" label="Fallback Model" />
                <q-tab name="vision" label="Vision Model" />
              </q-tabs>
              
              <q-separator dark />
              
              <q-tab-panels v-model="activeModelTab" animated class="bg-dark-page">
                <q-tab-panel name="primary">
                  <div class="text-subtitle1 q-mb-md">Primary Model Configuration</div>
                  <model-selector v-model="settings.models.primary" />
                </q-tab-panel>
                
                <q-tab-panel name="fallback">
                  <div class="row items-center q-mb-md">
                    <div class="text-subtitle1">Fallback Model Configuration</div>
                    <q-space />
                    <q-toggle 
                      v-model="useFallbackModel" 
                      label="Use fallback model" 
                      color="primary" 
                    />
                  </div>
                  <model-selector 
                    v-if="useFallbackModel" 
                    v-model="fallbackModel" 
                    @update:model-value="updateFallbackModel"
                  />
                </q-tab-panel>
                
                <q-tab-panel name="vision">
                  <div class="row items-center q-mb-md">
                    <div class="text-subtitle1">Vision Model Configuration</div>
                    <q-space />
                    <q-toggle 
                      v-model="useVisionModel" 
                      label="Use dedicated vision model" 
                      color="primary" 
                    />
                  </div>
                  <model-selector 
                    v-if="useVisionModel" 
                    v-model="visionModel" 
                    :vision-required="true"
                    @update:model-value="updateVisionModel"
                  />
                </q-tab-panel>
              </q-tab-panels>
            </q-tab-panel>
            
            <!-- Search Settings -->
            <q-tab-panel name="search">
              <div class="text-h6 q-mb-md">Search Settings</div>
              
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-card dark flat bordered class="bg-dark-page">
                    <q-card-section>
                      <div class="text-subtitle1">Search Configuration</div>
                      <q-separator dark class="q-my-md" />
                      
                      <q-list dense>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Search Engine</q-item-label>
                            <q-item-label caption>Engine to use for web searches</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-select
                              v-model="settings.search.engine"
                              :options="searchEngineOptions"
                              dense
                              options-dense
                              outlined
                              class="settings-select"
                            />
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Results Per Query</q-item-label>
                            <q-item-label caption>Number of search results to process per query</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-slider
                              v-model="settings.search.resultsPerQuery"
                              :min="3"
                              :max="15"
                              :step="1"
                              label
                              class="q-mr-md"
                              style="width: 120px"
                            />
                          </q-item-section>
                          <q-item-section side style="width: 40px">
                            <q-badge color="primary">{{ settings.search.resultsPerQuery }}</q-badge>
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
                
                <div class="col-12 col-md-6">
                  <q-card dark flat bordered class="bg-dark-page">
                    <q-card-section>
                      <div class="text-subtitle1">Domain Filters</div>
                      <q-separator dark class="q-my-md" />
                      
                      <div class="q-mb-md">
                        <div class="text-subtitle2 q-mb-sm">Include Domains</div>
                        <q-input
                          v-model="newIncludeDomain"
                          dense
                          filled
                          placeholder="e.g. .edu, .gov"
                          @keyup.enter="addIncludeDomain"
                        >
                          <template v-slot:append>
                            <q-btn
                              round
                              dense
                              flat
                              icon="add"
                              @click="addIncludeDomain"
                            />
                          </template>
                        </q-input>
                        
                        <div class="q-gutter-xs q-mt-sm">
                          <q-chip
                            v-for="(domain, index) in settings.search.domainFilters.include"
                            :key="`include-${index}`"
                            removable
                            @remove="removeIncludeDomain(index)"
                            color="primary"
                            text-color="white"
                            dense
                          >
                            {{ domain }}
                          </q-chip>
                        </div>
                      </div>
                      
                      <div>
                        <div class="text-subtitle2 q-mb-sm">Exclude Domains</div>
                        <q-input
                          v-model="newExcludeDomain"
                          dense
                          filled
                          placeholder="e.g. pinterest.com"
                          @keyup.enter="addExcludeDomain"
                        >
                          <template v-slot:append>
                            <q-btn
                              round
                              dense
                              flat
                              icon="add"
                              @click="addExcludeDomain"
                            />
                          </template>
                        </q-input>
                        
                        <div class="q-gutter-xs q-mt-sm">
                          <q-chip
                            v-for="(domain, index) in settings.search.domainFilters.exclude"
                            :key="`exclude-${index}`"
                            removable
                            @remove="removeExcludeDomain(index)"
                            color="negative"
                            text-color="white"
                            dense
                          >
                            {{ domain }}
                          </q-chip>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-tab-panel>
            
            <!-- System Settings -->
            <q-tab-panel name="system">
              <div class="text-h6 q-mb-md">System Settings</div>
              
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-card dark flat bordered class="bg-dark-page">
                    <q-card-section>
                      <div class="text-subtitle1">System Configuration</div>
                      <q-separator dark class="q-my-md" />
                      
                      <q-list dense>
                        <q-item>
                          <q-item-section>
                            <q-item-label>Max Concurrent Jobs</q-item-label>
                            <q-item-label caption>Maximum number of jobs to process simultaneously</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-slider
                              v-model="settings.system.maxConcurrentJobs"
                              :min="1"
                              :max="10"
                              :step="1"
                              label
                              class="q-mr-md"
                              style="width: 120px"
                            />
                          </q-item-section>
                          <q-item-section side style="width: 40px">
                            <q-badge color="primary">{{ settings.system.maxConcurrentJobs }}</q-badge>
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Logging Level</q-item-label>
                            <q-item-label caption>Detail level for application logs</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-select
                              v-model="settings.system.loggingLevel"
                              :options="loggingLevelOptions"
                              dense
                              options-dense
                              outlined
                              class="settings-select"
                            />
                          </q-item-section>
                        </q-item>
                        
                        <q-item>
                          <q-item-section>
                            <q-item-label>Storage Directory</q-item-label>
                            <q-item-label caption>Path to store research data</q-item-label>
                          </q-item-section>
                          <q-item-section side>
                            <q-input
                              v-model="settings.system.storageDirectory"
                              dense
                              filled
                              class="settings-input"
                            />
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-card-section>
                  </q-card>
                </div>
                
                <div class="col-12 col-md-6">
                  <q-card dark flat bordered class="bg-dark-page">
                    <q-card-section>
                      <div class="text-subtitle1">Advanced Options</div>
                      <q-separator dark class="q-my-md" />
                      
                      <div class="text-subtitle2 q-mb-sm">Configuration Import/Export</div>
                      <div class="row q-col-gutter-sm">
                        <div class="col-6">
                          <q-btn
                            color="primary"
                            icon="upload"
                            label="Import"
                            class="full-width"
                            @click="importConfig"
                          />
                        </div>
                        <div class="col-6">
                          <q-btn
                            color="primary"
                            icon="download"
                            label="Export"
                            class="full-width"
                            @click="exportConfig"
                          />
                        </div>
                      </div>
                      
                      <q-separator dark class="q-my-md" />
                      
                      <div class="text-subtitle2 q-mb-sm">Data Management</div>
                      <q-btn
                        color="warning"
                        icon="delete"
                        label="Clear All Data"
                        class="full-width"
                        @click="confirmClearData"
                      />
                    </q-card-section>
                  </q-card>
                  
                  <q-card dark flat bordered class="bg-dark-page q-mt-md">
                    <q-card-section>
                      <div class="text-subtitle1">About</div>
                      <q-separator dark class="q-my-md" />
                      
                      <div class="text-body2">
                        <div><strong>FoFo Research Tool</strong></div>
                        <div>Version: 0.1.0</div>
                        <div>Built with Quasar v2 and Vue 3</div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
        
        <div class="flex justify-end q-mt-md">
          <q-btn 
            flat 
            color="warning" 
            label="Reset to Defaults" 
            class="q-mr-md"
            @click="resetSettings" 
          />
          <q-btn 
            color="primary" 
            label="Save Settings" 
            :loading="saving"
            @click="saveSettings" 
          />
        </div>
      </template>
    </div>
    
    <!-- Confirm dialog for clearing data -->
    <q-dialog v-model="clearDataConfirm" persistent>
      <q-card dark>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm">Are you sure you want to clear all data?</span>
        </q-card-section>
        
        <q-card-section>
          This will delete all research jobs, reports, and settings.
          This action cannot be undone.
        </q-card-section>
        
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Delete Everything" color="negative" @click="clearAllData" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useConfigStore } from 'src/stores';
import ModelSelector from 'components/ModelSelector.vue';
import { ModelSettings } from 'src/components/models';

const $q = useQuasar();
const configStore = useConfigStore();

const loading = ref(true);
const saving = ref(false);
const activeTab = ref('general');
const activeModelTab = ref('primary');
const clearDataConfirm = ref(false);
const darkMode = ref(true);
const selectedLanguage = ref('en-US');

// Search domain inputs
const newIncludeDomain = ref('');
const newExcludeDomain = ref('');

// Model settings
const useFallbackModel = ref(false);
const useVisionModel = ref(false);
const fallbackModel = ref<ModelSettings>({
  provider: 'local',
  model: 'gemma3-27b',
  temperature: 0.5,
  topP: 0.9,
  maxTokens: 2000
});
const visionModel = ref<ModelSettings>({
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.2,
  maxTokens: 1000
});

// Settings object
const settings = ref({
  research: {
    maxIterations: 5,
    maxParallelSearches: 10,
    followLinks: true,
    maxLinksPerPage: 3,
    informationGainThreshold: 0.2
  },
  models: {
    primary: {
      provider: 'anthropic',
      model: 'claude-3.7-sonnet',
      temperature: 0.3,
      topP: 0.95,
      maxTokens: 4000
    },
    fallback: null as ModelSettings | null,
    vision: null as ModelSettings | null
  },
  search: {
    engine: 'duckduckgo',
    resultsPerQuery: 8,
    domainFilters: {
      include: ['.edu', '.gov', '.org'],
      exclude: ['pinterest.com', 'quora.com']
    }
  },
  reporting: {
    format: 'markdown',
    includeSources: true,
    summarizeSources: true,
    maxReportLength: 5000
  },
  system: {
    maxConcurrentJobs: 5,
    storageDirectory: './data',
    loggingLevel: 'info'
  }
});

// Options for selects
const searchEngineOptions = [
  { label: 'DuckDuckGo', value: 'duckduckgo' }
];

const reportFormatOptions = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'PDF', value: 'pdf' }
];

const reportLengthOptions = [
  { label: '3000 tokens', value: 3000 },
  { label: '5000 tokens', value: 5000 },
  { label: '8000 tokens', value: 8000 },
  { label: '10000 tokens', value: 10000 }
];

const loggingLevelOptions = [
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warn' },
  { label: 'Info', value: 'info' },
  { label: 'Debug', value: 'debug' }
];

const languageOptions = [
  { label: 'English', value: 'en-US' },
  { label: 'Español', value: 'es' }
];

// Set up fallback and vision models
function updateFallbackModel(model: ModelSettings) {
  fallbackModel.value = model;
  settings.value.models.fallback = useFallbackModel.value ? model : null;
}

function updateVisionModel(model: ModelSettings) {
  visionModel.value = model;
  settings.value.models.vision = useVisionModel.value ? model : null;
}

// Domain filter functions
function addIncludeDomain() {
  if (newIncludeDomain.value && !settings.value.search.domainFilters.include.includes(newIncludeDomain.value)) {
    settings.value.search.domainFilters.include.push(newIncludeDomain.value);
    newIncludeDomain.value = '';
  }
}

function removeIncludeDomain(index: number) {
  settings.value.search.domainFilters.include.splice(index, 1);
}

function addExcludeDomain() {
  if (newExcludeDomain.value && !settings.value.search.domainFilters.exclude.includes(newExcludeDomain.value)) {
    settings.value.search.domainFilters.exclude.push(newExcludeDomain.value);
    newExcludeDomain.value = '';
  }
}

function removeExcludeDomain(index: number) {
  settings.value.search.domainFilters.exclude.splice(index, 1);
}

// Theme toggle
function toggleDarkMode(val: boolean) {
  $q.dark.set(val);
}

// Import/export config
function importConfig() {
  // In a real implementation, this would open a file dialog
  $q.notify({
    type: 'info',
    message: 'Import configuration feature is not implemented yet',
    position: 'top'
  });
}

function exportConfig() {
  // In a real implementation, this would export the config to a file
  $q.notify({
    type: 'info',
    message: 'Export configuration feature is not implemented yet',
    position: 'top'
  });
}

// Confirm dialog for clearing data
function confirmClearData() {
  clearDataConfirm.value = true;
}

// Clear all data
function clearAllData() {
  // In a real implementation, this would clear all data
  $q.notify({
    type: 'info',
    message: 'All data has been cleared',
    position: 'top'
  });
}

// Reset settings to defaults
function resetSettings() {
  // In a real implementation, this would reset settings to defaults
  $q.notify({
    type: 'info',
    message: 'Settings reset to defaults',
    position: 'top'
  });
  
  // Reload settings
  loadSettings();
}

// Save settings
async function saveSettings() {
  saving.value = true;
  
  try {
    // Update models based on toggles
    settings.value.models.fallback = useFallbackModel.value ? fallbackModel.value : null;
    settings.value.models.vision = useVisionModel.value ? visionModel.value : null;
    
    // In a real implementation, this would save settings to the server
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    $q.notify({
      type: 'positive',
      message: 'Settings saved successfully',
      position: 'top'
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    
    $q.notify({
      type: 'negative',
      message: 'Failed to save settings',
      position: 'top'
    });
  } finally {
    saving.value = false;
  }
}

// Load settings
async function loadSettings() {
  loading.value = true;
  
  try {
    // In a real implementation, this would load settings from the server
    await configStore._mockFetchSystemConfig();
    
    // Set local settings from store
    if (configStore.systemConfig) {
      settings.value.research = { ...configStore.systemConfig.research };
      settings.value.search = { ...configStore.systemConfig.search };
      settings.value.reporting = { ...configStore.systemConfig.reporting };
      settings.value.system = { ...configStore.systemConfig.system };
      
      // Set primary model
      if (configStore.systemConfig.models.primary) {
        settings.value.models.primary = { ...configStore.systemConfig.models.primary };
      }
      
      // Set fallback model if exists
      if (configStore.systemConfig.models.fallback) {
        useFallbackModel.value = true;
        fallbackModel.value = { ...configStore.systemConfig.models.fallback };
        settings.value.models.fallback = { ...configStore.systemConfig.models.fallback };
      } else {
        useFallbackModel.value = false;
        settings.value.models.fallback = null;
      }
      
      // Set vision model if exists
      if (configStore.systemConfig.models.vision) {
        useVisionModel.value = true;
        visionModel.value = { ...configStore.systemConfig.models.vision };
        settings.value.models.vision = { ...configStore.systemConfig.models.vision };
      } else {
        useVisionModel.value = false;
        settings.value.models.vision = null;
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    
    $q.notify({
      type: 'negative',
      message: 'Failed to load settings',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  // Load available models
  await configStore._mockFetchAvailableModels();
  
  // Load settings
  await loadSettings();
});
</script>

<style scoped>
.settings-select, .settings-input {
  min-width: 150px;
}

:deep(.q-tab-panel) {
  padding: 16px;
}
</style>