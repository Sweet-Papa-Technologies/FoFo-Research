import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { ResearchJob, JobStatus } from 'src/components/models';

interface ResearchState {
  activeJobs: ResearchJob[];
  completedJobs: ResearchJob[];
  currentJob: ResearchJob | null;
  loading: boolean;
  error: string | null;
}

export const useResearchStore = defineStore('research', {
  state: (): ResearchState => ({
    activeJobs: [],
    completedJobs: [],
    currentJob: null,
    loading: false,
    error: null
  }),

  getters: {
    getJobById: (state) => (id: string) => {
      return [...state.activeJobs, ...state.completedJobs].find(job => job.id === id) || null;
    },
    
    pendingJobs: (state) => {
      return state.activeJobs.filter(job => job.status === JobStatus.PENDING);
    },
    
    runningJobs: (state) => {
      return state.activeJobs.filter(job => job.status === JobStatus.RUNNING);
    },
    
    failedJobs: (state) => {
      return state.activeJobs.filter(job => job.status === JobStatus.FAILED);
    },
    
    hasActiveJobs: (state) => {
      return state.activeJobs.length > 0;
    }
  },

  actions: {
    async fetchJobs() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await api.get('/research');
        const jobs = response.data.data.jobs;
        
        this.activeJobs = jobs.filter((job: ResearchJob) => 
          job.status !== JobStatus.COMPLETED
        );
        
        this.completedJobs = jobs.filter((job: ResearchJob) => 
          job.status === JobStatus.COMPLETED
        );
      } catch (error) {
        this.error = 'Failed to fetch research jobs';
        console.error('Error fetching jobs:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchJobById(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await api.get(`/research/${id}`);
        const job = response.data.data.job;
        
        // Update or add the job to the appropriate list
        if (job.status === JobStatus.COMPLETED) {
          const index = this.completedJobs.findIndex(j => j.id === job.id);
          if (index >= 0) {
            this.completedJobs[index] = job;
          } else {
            this.completedJobs.push(job);
          }
        } else {
          const index = this.activeJobs.findIndex(j => j.id === job.id);
          if (index >= 0) {
            this.activeJobs[index] = job;
          } else {
            this.activeJobs.push(job);
          }
        }
        
        this.currentJob = job;
        return job;
      } catch (error) {
        this.error = `Failed to fetch research job ${id}`;
        console.error(`Error fetching job ${id}:`, error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    async createJob(topic: string, config = {}) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await api.post('/research', { topic, ...config });
        const jobId = response.data.data.jobId;
        
        // Fetch the created job to get full details
        await this.fetchJobById(jobId);
        
        return jobId;
      } catch (error) {
        this.error = 'Failed to create research job';
        console.error('Error creating job:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    async pauseJob(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        await api.put(`/research/${id}`, { action: 'pause' });
        
        // Fetch updated job to get current state from server
        await this.fetchJobById(id);
        
        return true;
      } catch (error) {
        this.error = `Failed to pause research job ${id}`;
        console.error(`Error pausing job ${id}:`, error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    async resumeJob(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        await api.put(`/research/${id}`, { action: 'resume' });
        
        // Fetch updated job to get current state from server
        await this.fetchJobById(id);
        
        return true;
      } catch (error) {
        this.error = `Failed to resume research job ${id}`;
        console.error(`Error resuming job ${id}:`, error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    async cancelJob(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        await api.put(`/research/${id}`, { action: 'cancel' });
        
        // Fetch updated job to get current state from server
        await this.fetchJobById(id);
        
        return true;
      } catch (error) {
        this.error = `Failed to cancel research job ${id}`;
        console.error(`Error cancelling job ${id}:`, error);
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
});