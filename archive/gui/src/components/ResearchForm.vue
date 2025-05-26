<template>
  <q-form @submit="onSubmit" class="research-form">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-input
          v-model="formData.topic"
          filled
          dark
          label="Research Topic"
          hint="Enter the topic you want to research"
          :rules="[val => !!val || 'Topic is required']"
          class="q-mb-md"
        >
          <template v-slot:prepend>
            <q-icon name="science" />
          </template>
        </q-input>
      </div>

      <div class="col-12">
        <q-expansion-item
          expand-separator
          icon="tune"
          label="Advanced Settings"
          caption="Configure research parameters"
          header-class="text-primary"
        >
          <div class="q-pa-md bg-dark-page rounded-borders">
            <div class="row q-col-gutter-md">
              <div class="col-md-6 col-xs-12">
                <q-card dark flat class="card-dark q-mb-md">
                  <q-card-section>
                    <div class="text-h6">Research Configuration</div>
                    <q-separator dark class="q-my-md" />

                    <q-item dense>
                      <q-item-section>
                        <q-item-label>Max Iterations</q-item-label>
                        <q-item-label caption>Number of research cycles to perform</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-slider
                          v-model="formData.config.maxIterations"
                          :min="1"
                          :max="10"
                          :step="1"
                          label
                          class="q-mr-md"
                          style="width: 120px"
                        />
                      </q-item-section>
                      <q-item-section side>
                        <q-badge color="primary">{{ formData.config.maxIterations }}</q-badge>
                      </q-item-section>
                    </q-item>

                    <q-item dense>
                      <q-item-section>
                        <q-item-label>Max Parallel Searches</q-item-label>
                        <q-item-label caption>Number of concurrent web searches</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-slider
                          v-model="formData.config.maxParallelSearches"
                          :min="1"
                          :max="20"
                          :step="1"
                          label
                          class="q-mr-md"
                          style="width: 120px"
                        />
                      </q-item-section>
                      <q-item-section side>
                        <q-badge color="primary">{{ formData.config.maxParallelSearches }}</q-badge>
                      </q-item-section>
                    </q-item>

                    <q-item tag="label" dense>
                      <q-item-section>
                        <q-item-label>Follow Links</q-item-label>
                        <q-item-label caption>Follow relevant links from search results</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-toggle
                          v-model="formData.config.followLinks"
                          color="primary"
                        />
                      </q-item-section>
                    </q-item>

                    <q-item dense>
                      <q-item-section>
                        <q-item-label>Max Links Per Page</q-item-label>
                        <q-item-label caption>Maximum number of links to follow from each page</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-slider
                          v-model="formData.config.maxLinksPerPage"
                          :min="1"
                          :max="10"
                          :step="1"
                          label
                          class="q-mr-md"
                          :disable="!formData.config.followLinks"
                          style="width: 120px"
                        />
                      </q-item-section>
                      <q-item-section side>
                        <q-badge :color="formData.config.followLinks ? 'primary' : 'grey'">
                          {{ formData.config.maxLinksPerPage }}
                        </q-badge>
                      </q-item-section>
                    </q-item>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-md-6 col-xs-12">
                <q-card dark flat class="card-dark q-mb-md">
                  <q-card-section>
                    <div class="text-h6">Search Settings</div>
                    <q-separator dark class="q-my-md" />

                    <q-item dense>
                      <q-item-section>
                        <q-item-label>Search Engine</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-select
                          v-model="formData.search.engine"
                          :options="searchEngineOptions"
                          dense
                          options-dense
                          outlined
                          style="width: 150px"
                        />
                      </q-item-section>
                    </q-item>

                    <q-item dense>
                      <q-item-section>
                        <q-item-label>Results Per Query</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-slider
                          v-model="formData.search.resultsPerQuery"
                          :min="3"
                          :max="15"
                          :step="1"
                          label
                          class="q-mr-md"
                          style="width: 120px"
                        />
                      </q-item-section>
                      <q-item-section side>
                        <q-badge color="primary">{{ formData.search.resultsPerQuery }}</q-badge>
                      </q-item-section>
                    </q-item>

                    <q-expansion-item
                      expand-separator
                      label="Domain Filters"
                      caption="Include or exclude specific domains"
                      header-class="text-primary"
                    >
                      <div class="q-pa-md">
                        <q-list dense>
                          <q-item>
                            <q-item-section>
                              <q-input
                                v-model="newIncludeDomain"
                                dense
                                filled
                                label="Include Domain"
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
                            </q-item-section>
                          </q-item>

                          <q-item>
                            <q-item-section>
                              <div class="q-gutter-xs q-mt-sm">
                                <q-chip
                                  v-for="(domain, index) in formData.search.domainFilters.include"
                                  :key="index"
                                  removable
                                  @remove="removeIncludeDomain(index)"
                                  color="primary"
                                  text-color="white"
                                  dense
                                >
                                  {{ domain }}
                                </q-chip>
                              </div>
                            </q-item-section>
                          </q-item>

                          <q-separator dark spaced />

                          <q-item>
                            <q-item-section>
                              <q-input
                                v-model="newExcludeDomain"
                                dense
                                filled
                                label="Exclude Domain"
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
                            </q-item-section>
                          </q-item>

                          <q-item>
                            <q-item-section>
                              <div class="q-gutter-xs q-mt-sm">
                                <q-chip
                                  v-for="(domain, index) in formData.search.domainFilters.exclude"
                                  :key="index"
                                  removable
                                  @remove="removeExcludeDomain(index)"
                                  color="negative"
                                  text-color="white"
                                  dense
                                >
                                  {{ domain }}
                                </q-chip>
                              </div>
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </div>
                    </q-expansion-item>
                  </q-card-section>
                </q-card>
              </div>

              <div class="col-12">
                <q-card dark flat class="card-dark">
                  <q-card-section>
                    <div class="text-h6">Model Settings</div>
                    <q-separator dark class="q-my-md" />

                    <q-tabs
                      v-model="modelTab"
                      dense
                      class="text-primary"
                      active-color="primary"
                      indicator-color="primary"
                      align="justify"
                      narrow-indicator
                    >
                      <q-tab name="primary" label="Primary Model" />
                      <q-tab name="fallback" label="Fallback Model" />
                      <q-tab name="vision" label="Vision Model" />
                    </q-tabs>

                    <q-separator dark />

                    <q-tab-panels v-model="modelTab" animated class="bg-dark-page">
                      <q-tab-panel name="primary">
                        <model-selector v-model="formData.models.primary" />
                      </q-tab-panel>

                      <q-tab-panel name="fallback">
                        <div class="row items-center q-mb-md">
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
                          <q-toggle
                            v-model="useVisionModel"
                            label="Use dedicated vision model for screenshots"
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
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
        </q-expansion-item>
      </div>
    </div>

    <div class="row justify-end q-mt-lg">
      <q-btn
        type="reset"
        flat
        label="Reset"
        color="warning"
        class="q-mr-sm"
        @click="resetForm"
      />
      <q-btn
        type="submit"
        :loading="loading"
        label="Start Research"
        color="primary"
        icon="science"
      >
        <template v-slot:loading>
          <q-spinner-dots />
          <span class="q-ml-sm">Submitting...</span>
        </template>
      </q-btn>
    </div>
  </q-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useConfigStore } from 'src/stores';
import { JobConfig, SearchSettings, ModelSettings } from 'src/components/models';
import ModelSelector from 'components/ModelSelector.vue';

const props = defineProps<{
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', data: any): void;
}>();

const configStore = useConfigStore();

const modelTab = ref('primary');
const useVisionModel = ref(false);
const useFallbackModel = ref(false);
const newIncludeDomain = ref('');
const newExcludeDomain = ref('');

// Default values - would ideally come from the config store
const defaultConfig: JobConfig = {
  maxIterations: 5,
  maxParallelSearches: 10,
  followLinks: true,
  maxLinksPerPage: 3,
  informationGainThreshold: 0.2
};

const defaultSearch: SearchSettings = {
  engine: 'duckduckgo',
  resultsPerQuery: 8,
  domainFilters: {
    include: ['.edu', '.gov', '.org'],
    exclude: ['pinterest.com', 'quora.com']
  }
};

const defaultPrimary: ModelSettings = {
  provider: 'openai',
  model: 'gemma-3-27b-it-abliterated',
  temperature: 0.3,
  topP: 0.95,
  maxTokens: 4000
};

const formData = reactive({
  topic: '',
  config: { ...defaultConfig },
  search: {
    ...defaultSearch,
    domainFilters: {
      include: [...defaultSearch.domainFilters?.include || []],
      exclude: [...defaultSearch.domainFilters?.exclude || []]
    }
  },
  models: {
    primary: { ...defaultPrimary }
  }
});

const fallbackModel = ref<ModelSettings>({
  provider: 'openai',
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

const searchEngineOptions = [
  { label: 'DuckDuckGo', value: 'duckduckgo' }
];

function addIncludeDomain() {
  if (newIncludeDomain.value && !formData.search.domainFilters.include.includes(newIncludeDomain.value)) {
    formData.search.domainFilters.include.push(newIncludeDomain.value);
    newIncludeDomain.value = '';
  }
}

function removeIncludeDomain(index: number) {
  formData.search.domainFilters.include.splice(index, 1);
}

function addExcludeDomain() {
  if (newExcludeDomain.value && !formData.search.domainFilters.exclude.includes(newExcludeDomain.value)) {
    formData.search.domainFilters.exclude.push(newExcludeDomain.value);
    newExcludeDomain.value = '';
  }
}

function removeExcludeDomain(index: number) {
  formData.search.domainFilters.exclude.splice(index, 1);
}

function updateFallbackModel(model: ModelSettings) {
  fallbackModel.value = model;
}

function updateVisionModel(model: ModelSettings) {
  visionModel.value = model;
}

function onSubmit() {
  // Build the final form data with optional models
  const finalFormData = {
    ...formData,
    models: {
      primary: formData.models.primary,
      ...(useFallbackModel.value ? { fallback: fallbackModel.value } : {}),
      ...(useVisionModel.value ? { vision: visionModel.value } : {})
    }
  };

  emit('submit', finalFormData);
}

function resetForm() {
  formData.topic = '';
  formData.config = { ...defaultConfig };
  formData.search = {
    ...defaultSearch,
    domainFilters: {
      include: [...defaultSearch.domainFilters?.include || []],
      exclude: [...defaultSearch.domainFilters?.exclude || []]
    }
  };
  formData.models.primary = { ...defaultPrimary };

  useVisionModel.value = false;
  useFallbackModel.value = false;
  modelTab.value = 'primary';
}
</script>

<style scoped>
.research-form {
  max-width: 100%;
}
</style>
