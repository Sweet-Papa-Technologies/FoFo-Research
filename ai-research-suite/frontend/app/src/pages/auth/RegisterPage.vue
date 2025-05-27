<template>
  <q-page class="flex flex-center">
    <q-card class="register-card" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">AI Research Suite</div>
        <div class="text-subtitle2 text-center text-grey-6 q-mb-lg">
          Create your account
        </div>
      </q-card-section>
      
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-card-section>
          <q-input
            v-model="credentials.name"
            type="text"
            label="Name (optional)"
            outlined
            autofocus
          />
          
          <q-input
            v-model="credentials.email"
            type="email"
            label="Email"
            outlined
            class="q-mt-md"
            :rules="[
              val => !!val || 'Email is required',
              val => emailRegex.test(val) || 'Please enter a valid email'
            ]"
            lazy-rules
          />
          
          <q-input
            v-model="credentials.password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            outlined
            class="q-mt-md"
            :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 8 || 'Password must be at least 8 characters'
            ]"
            lazy-rules
          >
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>
          
          <q-input
            v-model="confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            label="Confirm Password"
            outlined
            class="q-mt-md"
            :rules="[
              val => !!val || 'Please confirm your password',
              val => val === credentials.password || 'Passwords do not match'
            ]"
            lazy-rules
          />
        </q-card-section>
        
        <q-card-actions>
          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            label="Create Account"
            :loading="loading"
            :disable="loading"
          />
        </q-card-actions>
      </q-form>
      
      <q-card-section>
        <div class="text-center">
          <div class="text-grey-6">
            Already have an account?
            <router-link to="/login" class="text-primary">
              Sign in
            </router-link>
          </div>
        </div>
      </q-card-section>
      
      <q-inner-loading :showing="loading">
        <q-spinner-dots size="50px" color="primary" />
      </q-inner-loading>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const credentials = ref({
  name: '',
  email: '',
  password: ''
});
const confirmPassword = ref('');
const loading = ref(false);
const showPassword = ref(false);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function onSubmit() {
  loading.value = true;
  
  try {
    await authStore.register(credentials.value);
    
    $q.notify({
      type: 'positive',
      message: 'Account created successfully!',
      position: 'top'
    });
    
    await router.push('/dashboard');
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Registration failed. Please try again.',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.register-card {
  max-width: 500px;
  width: 100%;
  margin: 16px;
}

a {
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
}
</style>