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
        // This would be a real API call in production
        const response = await api.get('/api/research');
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
        // This would be a real API call in production
        const response = await api.get(`/api/research/${id}`);
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
        // This would be a real API call in production
        const response = await api.post('/api/research', { topic, ...config });
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
        // This would be a real API call in production
        await api.put(`/api/research/${id}`, { action: 'pause' });
        
        // Update job status locally
        const jobIndex = this.activeJobs.findIndex(job => job.id === id);
        if (jobIndex >= 0) {
          this.activeJobs[jobIndex].status = JobStatus.PAUSED;
        }
        
        if (this.currentJob?.id === id) {
          this.currentJob.status = JobStatus.PAUSED;
        }
        
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
        // This would be a real API call in production
        await api.put(`/api/research/${id}`, { action: 'resume' });
        
        // Update job status locally
        const jobIndex = this.activeJobs.findIndex(job => job.id === id);
        if (jobIndex >= 0) {
          this.activeJobs[jobIndex].status = JobStatus.RUNNING;
        }
        
        if (this.currentJob?.id === id) {
          this.currentJob.status = JobStatus.RUNNING;
        }
        
        return true;
      } catch (error) {
        this.error = `Failed to resume research job ${id}`;
        console.error(`Error resuming job ${id}:`, error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    // Mock implementation for development without backend
    async _mockFetchJobs() {
      this.loading = true;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      this.activeJobs = [
        {
          id: '1',
          topic: 'Artificial Intelligence Ethics',
          status: JobStatus.RUNNING,
          config: {
            maxIterations: 5,
            maxParallelSearches: 10,
            followLinks: true,
            maxLinksPerPage: 3,
            informationGainThreshold: 0.2
          },
          search: {
            engine: 'duckduckgo',
            resultsPerQuery: 8
          },
          models: {
            primary: {
              provider: 'anthropic',
              model: 'claude-3.7-sonnet',
              temperature: 0.3
            }
          },
          progress: {
            currentIteration: 2,
            processedUrls: 12,
            totalUrls: 30
          },
          createdAt: yesterday,
          updatedAt: now
        },
        {
          id: '2',
          topic: 'Quantum Computing',
          status: JobStatus.PENDING,
          config: {
            maxIterations: 3,
            maxParallelSearches: 5,
            followLinks: true,
            maxLinksPerPage: 2,
            informationGainThreshold: 0.3
          },
          search: {
            engine: 'duckduckgo',
            resultsPerQuery: 6
          },
          models: {
            primary: {
              provider: 'openai',
              model: 'gpt-4o',
              temperature: 0.2
            }
          },
          progress: {
            currentIteration: 0,
            processedUrls: 0,
            totalUrls: 0
          },
          createdAt: now,
          updatedAt: now
        }
      ];
      
      this.completedJobs = [
        {
          id: '3',
          topic: 'Climate Change',
          status: JobStatus.COMPLETED,
          config: {
            maxIterations: 5,
            maxParallelSearches: 10,
            followLinks: true,
            maxLinksPerPage: 3,
            informationGainThreshold: 0.2
          },
          search: {
            engine: 'duckduckgo',
            resultsPerQuery: 8
          },
          models: {
            primary: {
              provider: 'anthropic',
              model: 'claude-3.7-sonnet',
              temperature: 0.3
            }
          },
          progress: {
            currentIteration: 5,
            processedUrls: 40,
            totalUrls: 40
          },
          createdAt: yesterday,
          updatedAt: yesterday,
          completedAt: yesterday,
          reportId: '101'
        }
      ];
      
      this.loading = false;
    }
  }
});