<template>
  <q-card flat bordered>
    <q-card-section class="q-pa-sm">
      <div class="row items-center no-wrap">
        <div class="col">
          <div class="text-subtitle2 ellipsis-2-lines">{{ source.title }}</div>
          <div class="text-caption text-grey-6 ellipsis">{{ source.url }}</div>
        </div>
        <div class="col-auto">
          <q-circular-progress
            :value="source.relevanceScore"
            size="50px"
            :thickness="0.2"
            color="primary"
            track-color="grey-3"
            class="q-ml-sm"
          >
            <div class="text-caption text-weight-bold">
              {{ Math.round(source.relevanceScore) }}%
            </div>
          </q-circular-progress>
        </div>
      </div>
      
      <div v-if="source.summary" class="text-body2 text-grey-8 q-mt-sm ellipsis-3-lines">
        {{ source.summary }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { ResearchSource } from '../../types/research';

defineProps<{
  source: ResearchSource;
}>();
</script>

<style lang="scss" scoped>
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ellipsis-2-lines {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ellipsis-3-lines {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>