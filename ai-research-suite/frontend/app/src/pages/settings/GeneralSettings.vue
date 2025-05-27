<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">Settings</div>
    
    <div class="row q-col-gutter-md">
      <div class="col-12 col-lg-8">
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Account Information</div>
            
            <q-form @submit="updateProfile" class="q-gutter-md">
              <q-input
                v-model="profile.email"
                label="Email"
                type="email"
                outlined
                disable
                hint="Email cannot be changed"
              />
              
              <q-input
                v-model="profile.name"
                label="Display Name"
                outlined
              />
              
              <div class="text-right">
                <q-btn
                  type="submit"
                  color="primary"
                  label="Update Profile"
                  :loading="savingProfile"
                  unelevated
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
        
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="text-h6 q-mb-md">Change Password</div>
            
            <q-form @submit="changePassword" class="q-gutter-md">
              <q-input
                v-model="passwordForm.oldPassword"
                type="password"
                label="Current Password"
                outlined
                :rules="[val => !!val || 'Current password is required']"
              />
              
              <q-input
                v-model="passwordForm.newPassword"
                type="password"
                label="New Password"
                outlined
                :rules="[
                  val => !!val || 'New password is required',
                  val => val.length >= 8 || 'Password must be at least 8 characters'
                ]"
              />
              
              <q-input
                v-model="passwordForm.confirmPassword"
                type="password"
                label="Confirm New Password"
                outlined
                :rules="[
                  val => !!val || 'Please confirm your password',
                  val => val === passwordForm.newPassword || 'Passwords do not match'
                ]"
              />
              
              <div class="text-right">
                <q-btn
                  type="submit"
                  color="primary"
                  label="Change Password"
                  :loading="changingPassword"
                  unelevated
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
        
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Preferences</div>
            
            <div class="q-gutter-md">
              <q-toggle
                v-model="preferences.darkMode"
                label="Dark Mode"
                @update:model-value="toggleDarkMode"
              />
              
              <q-separator />
              
              <div class="text-subtitle2 q-mb-sm">Default Research Parameters</div>
              
              <q-input
                v-model.number="preferences.defaultMaxSources"
                type="number"
                label="Default Maximum Sources"
                outlined
                :min="5"
                :max="500"
                hint="Default number of sources for new research"
              />
              
              <q-select
                v-model="preferences.defaultReportLength"
                :options="reportLengthOptions"
                label="Default Report Length"
                outlined
                emit-value
                map-options
              />
              
              <q-select
                v-model="preferences.defaultDepth"
                :options="depthOptions"
                label="Default Research Depth"
                outlined
                emit-value
                map-options
              />
              
              <div class="text-right q-mt-md">
                <q-btn
                  color="primary"
                  label="Save Preferences"
                  @click="savePreferences"
                  :loading="savingPreferences"
                  unelevated
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-lg-4">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Account Status</div>
            
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label>Account Type</q-item-label>
                  <q-item-label caption>{{ authStore.user?.role || 'User' }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item>
                <q-item-section>
                  <q-item-label>Member Since</q-item-label>
                  <q-item-label caption>{{ formatDate(authStore.user?.createdAt) }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item>
                <q-item-section>
                  <q-item-label>Total Research Sessions</q-item-label>
                  <q-item-label caption>{{ totalSessions }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item>
                <q-item-section>
                  <q-item-label>Reports Generated</q-item-label>
                  <q-item-label caption>{{ completedReports }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          
          <q-separator />
          
          <q-card-actions>
            <q-btn
              flat
              color="negative"
              label="Sign Out"
              icon="logout"
              @click="signOut"
              class="full-width"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '../../stores/auth';
import { useResearchStore } from '../../stores/research';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const researchStore = useResearchStore();

const profile = ref({
  email: authStore.user?.email || '',
  name: authStore.user?.name || ''
});

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const preferences = ref({
  darkMode: $q.dark.isActive,
  defaultMaxSources: 20,
  defaultReportLength: 'medium',
  defaultDepth: 'standard'
});

const savingProfile = ref(false);
const changingPassword = ref(false);
const savingPreferences = ref(false);

const reportLengthOptions = [
  { label: 'Short (1-2 pages)', value: 'short' },
  { label: 'Medium (3-5 pages)', value: 'medium' },
  { label: 'Long (6+ pages)', value: 'long' }
];

const depthOptions = [
  { label: 'Basic - Quick overview', value: 'basic' },
  { label: 'Standard - Balanced analysis', value: 'standard' },
  { label: 'Comprehensive - In-depth research', value: 'comprehensive' }
];

const totalSessions = computed(() => 
  researchStore.sessionHistory.length + researchStore.activeSessionCount
);

const completedReports = computed(() => 
  researchStore.completedSessions.length
);

onMounted(() => {
  // Load user preferences from localStorage or API
  const savedPreferences = localStorage.getItem('userPreferences');
  if (savedPreferences) {
    Object.assign(preferences.value, JSON.parse(savedPreferences));
  }
});

async function updateProfile() {
  savingProfile.value = true;
  
  try {
    // TODO: Implement profile update API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    $q.notify({
      type: 'positive',
      message: 'Profile updated successfully',
      position: 'top'
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to update profile',
      position: 'top'
    });
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  changingPassword.value = true;
  
  try {
    await authStore.changePassword(
      passwordForm.value.oldPassword,
      passwordForm.value.newPassword
    );
    
    // Clear form
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    
    $q.notify({
      type: 'positive',
      message: 'Password changed successfully',
      position: 'top'
    });
  } catch (error: any) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.error || 'Failed to change password',
      position: 'top'
    });
  } finally {
    changingPassword.value = false;
  }
}

function toggleDarkMode(value: boolean) {
  $q.dark.set(value);
}

async function savePreferences() {
  savingPreferences.value = true;
  
  try {
    // Save to localStorage
    localStorage.setItem('userPreferences', JSON.stringify(preferences.value));
    
    // TODO: Save to API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    $q.notify({
      type: 'positive',
      message: 'Preferences saved successfully',
      position: 'top'
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to save preferences',
      position: 'top'
    });
  } finally {
    savingPreferences.value = false;
  }
}

async function signOut() {
  $q.dialog({
    title: 'Sign Out',
    message: 'Are you sure you want to sign out?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await authStore.logout();
      await router.push('/login');
      
      $q.notify({
        type: 'positive',
        message: 'Signed out successfully',
        position: 'top'
      });
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to sign out',
        position: 'top'
      });
    }
  });
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
</script>