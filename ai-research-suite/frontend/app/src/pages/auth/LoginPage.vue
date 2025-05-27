<template>
  <q-page class="flex flex-center">
    <q-card class="login-card" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">AI Research Suite</div>
        <div class="text-subtitle2 text-center text-grey-6 q-mb-lg">
          Sign in to your account
        </div>
      </q-card-section>
      
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-card-section>
          <q-input
            v-model="credentials.email"
            type="email"
            label="Email"
            outlined
            autocomplete="email"
            :rules="[
              val => !!val || 'Email is required',
              val => emailRegex.test(val) || 'Please enter a valid email'
            ]"
            lazy-rules
            autofocus
          />
          
          <q-input
            v-model="credentials.password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            outlined
            autocomplete="current-password"
            class="q-mt-md"
            :rules="[val => !!val || 'Password is required']"
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
          
          <div class="q-mt-md">
            <q-checkbox
              v-model="rememberMe"
              label="Remember me"
              color="primary"
            />
          </div>
        </q-card-section>
        
        <q-card-actions>
          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            label="Sign In"
            :loading="loading"
            :disable="loading"
          />
        </q-card-actions>
      </q-form>
      
      <q-card-section>
        <div class="text-center">
          <div class="text-grey-6">
            Don't have an account?
            <router-link to="/register" class="text-primary">
              Sign up
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
  email: '',
  password: ''
});
const loading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(true);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function onSubmit() {
  loading.value = true;
  
  try {
    await authStore.login(credentials.value);
    
    $q.notify({
      type: 'positive',
      message: 'Successfully logged in',
      position: 'top'
    });
    
    const redirectTo = router.currentRoute.value.query.redirect as string;
    await router.push(redirectTo || '/dashboard');
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Login failed. Please check your credentials.',
      position: 'top'
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.login-card {
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