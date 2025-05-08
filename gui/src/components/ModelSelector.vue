<template>
  <div class="model-selector">
    <div class="row q-col-gutter-md">
      <div class="col-md-6 col-xs-12">
        <q-select
          v-model="selectedProvider"
          :options="providerOptions"
          label="Provider"
          filled
          dense
          emit-value
          map-options
          class="q-mb-md"
        >
          <template v-slot:prepend>
            <q-icon name="cloud" />
          </template>
        </q-select>

        <q-select
          v-model="selectedModel"
          :options="filteredModelOptions"
          label="Model"
          filled
          dense
          emit-value
          map-options
          :disable="!selectedProvider"
          class="q-mb-md"
        >
          <template v-slot:prepend>
            <q-icon name="smart_toy" />
          </template>
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>{{ scope.opt.label }}</q-item-label>
                <q-item-label caption>
                  <q-badge
                    v-for="capability in scope.opt.capabilities"
                    :key="capability"
                    color="primary"
                    text-color="white"
                    class="q-mr-xs"
                  >
                    {{ capability }}
                  </q-badge>
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>

      <div class="col-md-6 col-xs-12">
        <q-card dark bordered flat class="bg-dark">
          <q-card-section>
            <div class="text-subtitle1">Model Parameters</div>
            <q-separator dark class="q-my-sm" />

            <div class="row q-col-gutter-sm">
              <div class="col-12">
                <div class="row items-center">
                  <div class="col-4">Temperature:</div>
                  <div class="col-6">
                    <q-slider
                      v-model="modelParams.temperature"
                      :min="0"
                      :max="1"
                      :step="0.05"
                      label
                      color="primary"
                    />
                  </div>
                  <div class="col-2 text-right">
                    {{ modelParams.temperature.toFixed(2) }}
                  </div>
                </div>
              </div>

              <div class="col-12">
                <div class="row items-center">
                  <div class="col-4">Top P:</div>
                  <div class="col-6">
                    <q-slider
                      v-model="modelParams.topP"
                      :min="0"
                      :max="1"
                      :step="0.05"
                      label
                      color="primary"
                    />
                  </div>
                  <div class="col-2 text-right">
                    {{ modelParams.topP?.toFixed(2) || 'N/A' }}
                  </div>
                </div>
              </div>

              <div class="col-12">
                <div class="row items-center">
                  <div class="col-4">Max Tokens:</div>
                  <div class="col-6">
                    <q-slider
                      v-model="modelParams.maxTokens"
                      :min="500"
                      :max="8000"
                      :step="500"
                      label
                      color="primary"
                    />
                  </div>
                  <div class="col-2 text-right">
                    {{ modelParams.maxTokens || 'N/A' }}
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useConfigStore } from 'src/stores';
import { ModelSettings } from 'src/components/models';

const props = defineProps<{
  modelValue: ModelSettings;
  visionRequired?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelSettings): void;
}>();

const configStore = useConfigStore();

const selectedProvider = ref<string>(props.modelValue.provider);
const selectedModel = ref<string>(props.modelValue.model);

const modelParams = ref<{
  temperature: number;
  topP?: number;
  maxTokens?: number;
}>({
  temperature: props.modelValue.temperature || 0.3,
  topP: props.modelValue.topP || 0.9,
  maxTokens: props.modelValue.maxTokens || 2000
});

// Mock data for providers and models - this would come from the config store
const providers = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'local', label: 'Local Models' }
];

const models = [
  { 
    value: 'claude-3.7-sonnet', 
    label: 'Claude 3.7 Sonnet', 
    provider: 'anthropic',
    capabilities: ['text', 'vision'] 
  },
  { 
    value: 'claude-3.5-sonnet', 
    label: 'Claude 3.5 Sonnet', 
    provider: 'anthropic',
    capabilities: ['text', 'vision'] 
  },
  { 
    value: 'gpt-4o', 
    label: 'GPT-4o', 
    provider: 'openai',
    capabilities: ['text', 'vision'] 
  },
  { 
    value: 'gpt-4-turbo', 
    label: 'GPT-4 Turbo', 
    provider: 'openai',
    capabilities: ['text'] 
  },
  { 
    value: 'gemini-2.0-flash', 
    label: 'Gemini 2.0 Flash', 
    provider: 'google',
    capabilities: ['text', 'vision'] 
  },
  { 
    value: 'gemma3-27b', 
    label: 'Gemma3 27b', 
    provider: 'local',
    capabilities: ['text'] 
  },
  { 
    value: 'phi-4-reasoning', 
    label: 'Phi-4 Reasoning', 
    provider: 'local',
    capabilities: ['text'] 
  }
];

const providerOptions = computed(() => {
  return providers;
});

const filteredModelOptions = computed(() => {
  if (!selectedProvider.value) return [];
  
  return models
    .filter(model => model.provider === selectedProvider.value)
    .filter(model => {
      if (props.visionRequired) {
        return model.capabilities.includes('vision');
      }
      return true;
    });
});

watch([selectedProvider, selectedModel, modelParams], () => {
  if (selectedProvider.value && selectedModel.value) {
    const updatedModel: ModelSettings = {
      provider: selectedProvider.value,
      model: selectedModel.value,
      temperature: modelParams.value.temperature,
      topP: modelParams.value.topP,
      maxTokens: modelParams.value.maxTokens
    };
    
    emit('update:modelValue', updatedModel);
  }
});

// When provider changes, select the first available model
watch(selectedProvider, (newProvider) => {
  const availableModels = filteredModelOptions.value;
  if (availableModels.length > 0) {
    selectedModel.value = availableModels[0].value;
  } else {
    selectedModel.value = '';
  }
});

onMounted(() => {
  // Load available models from config store
  // In a real implementation, we would fetch this data from the config store
  // configStore._mockFetchAvailableModels();
  
  // Set initial values
  selectedProvider.value = props.modelValue.provider;
  selectedModel.value = props.modelValue.model;
  
  modelParams.value = {
    temperature: props.modelValue.temperature || 0.3,
    topP: props.modelValue.topP || 0.9,
    maxTokens: props.modelValue.maxTokens || 2000
  };
});
</script>

<style scoped>
.model-selector {
  width: 100%;
}
</style>