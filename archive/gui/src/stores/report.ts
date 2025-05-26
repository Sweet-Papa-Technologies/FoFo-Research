import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { Report, ReportFormat, ExportOptions } from 'src/components/models';

interface ReportState {
  reports: Record<string, Report>;
  currentReport: Report | null;
  loading: boolean;
  error: string | null;
}

export const useReportStore = defineStore('report', {
  state: (): ReportState => ({
    reports: {},
    currentReport: null,
    loading: false,
    error: null
  }),

  getters: {
    getReportById: (state) => (id: string) => {
      return state.reports[id] || null;
    },
    
    allReports: (state) => {
      return Object.values(state.reports).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  },

  actions: {
    async fetchReports() {
      this.loading = true;
      this.error = null;
      
      try {
        // This would be a real API call in production
        const response = await api.get('/api/reports');
        const reports = response.data.data.reports;
        
        // Convert array to record for easier lookup
        const reportsRecord: Record<string, Report> = {};
        reports.forEach((report: Report) => {
          reportsRecord[report.id] = report;
        });
        
        this.reports = reportsRecord;
      } catch (error) {
        this.error = 'Failed to fetch reports';
        console.error('Error fetching reports:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async fetchReportById(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        // This would be a real API call in production
        const response = await api.get(`/api/reports/${id}`);
        const report = response.data.data.report;
        
        this.reports[id] = report;
        this.currentReport = report;
        
        return report;
      } catch (error) {
        this.error = `Failed to fetch report ${id}`;
        console.error(`Error fetching report ${id}:`, error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    async exportReport(id: string, options: ExportOptions) {
      this.loading = true;
      this.error = null;
      
      try {
        // This would be a real API call in production
        const response = await api.post(`/api/reports/${id}/export`, options);
        const downloadUrl = response.data.data.downloadUrl;
        
        return downloadUrl;
      } catch (error) {
        this.error = `Failed to export report ${id}`;
        console.error(`Error exporting report ${id}:`, error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    
    // Mock implementation for development without backend
    async _mockFetchReports() {
      this.loading = true;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const mockReports: Record<string, Report> = {
        '101': {
          id: '101',
          jobId: '3',
          topic: 'Climate Change',
          executiveSummary: 'Climate change is a global challenge requiring immediate action...',
          keyFindings: [
            'Global temperatures have risen by approximately 1.1°C since pre-industrial times',
            'Sea levels are rising at an accelerating rate due to melting ice sheets',
            'Extreme weather events are becoming more frequent and severe',
            'Carbon dioxide levels in the atmosphere are at their highest in 800,000 years'
          ],
          sections: [
            {
              title: 'Current State of Climate Change',
              content: 'The Earth\'s climate has changed throughout history. Just in the last 650,000 years...',
              sources: ['source1', 'source2', 'source3']
            },
            {
              title: 'Impacts on Ecosystems',
              content: 'Climate change affects ecosystems worldwide. Rising temperatures are causing...',
              sources: ['source2', 'source4']
            },
            {
              title: 'Mitigation Strategies',
              content: 'Various strategies exist to mitigate climate change impacts. These include...',
              sources: ['source5', 'source6']
            }
          ],
          sources: {
            'source1': {
              url: 'https://climate.nasa.gov/',
              title: 'NASA Climate Change',
              summary: 'Official NASA website providing information about climate change research',
              credibilityScore: 0.95,
              captureTimestamp: yesterday
            },
            'source2': {
              url: 'https://www.ipcc.ch/',
              title: 'Intergovernmental Panel on Climate Change',
              summary: 'United Nations body for assessing the science related to climate change',
              credibilityScore: 0.98,
              captureTimestamp: yesterday
            },
            'source3': {
              url: 'https://www.noaa.gov/climate',
              title: 'NOAA Climate Program',
              summary: 'National Oceanic and Atmospheric Administration climate research',
              credibilityScore: 0.93,
              captureTimestamp: yesterday
            },
            'source4': {
              url: 'https://www.nature.com/nclimate/',
              title: 'Nature Climate Change Journal',
              summary: 'Scientific journal dedicated to climate change research',
              credibilityScore: 0.92,
              captureTimestamp: yesterday
            },
            'source5': {
              url: 'https://www.epa.gov/climate-change',
              title: 'EPA Climate Change',
              summary: 'Environmental Protection Agency information on climate change',
              credibilityScore: 0.9,
              captureTimestamp: yesterday
            },
            'source6': {
              url: 'https://www.un.org/en/climatechange',
              title: 'United Nations Climate Action',
              summary: 'UN initiatives and programs addressing climate change',
              credibilityScore: 0.94,
              captureTimestamp: yesterday
            }
          },
          createdAt: yesterday,
          format: ReportFormat.MARKDOWN
        },
        '102': {
          id: '102',
          jobId: '4',
          topic: 'Renewable Energy Technologies',
          executiveSummary: 'Renewable energy technologies are rapidly evolving and becoming more cost-effective...',
          keyFindings: [
            'Solar and wind power are now cost-competitive with fossil fuels in many markets',
            'Energy storage technologies are developing rapidly to address intermittency issues',
            'Developing countries are increasingly adopting renewable energy solutions',
            'Integration of renewable sources into existing grids presents technical challenges'
          ],
          sections: [
            {
              title: 'Solar Power Technology',
              content: 'Solar photovoltaic technology has seen significant improvements in efficiency and cost...',
              sources: ['source7', 'source8']
            },
            {
              title: 'Wind Energy Developments',
              content: 'Wind turbine technology continues to advance with larger turbines and offshore installations...',
              sources: ['source9', 'source10']
            },
            {
              title: 'Energy Storage Solutions',
              content: 'Energy storage is critical for managing intermittent renewable sources...',
              sources: ['source11', 'source12']
            }
          ],
          sources: {
            'source7': {
              url: 'https://www.nrel.gov/solar/',
              title: 'National Renewable Energy Laboratory - Solar',
              summary: 'Research and development of solar energy technologies',
              credibilityScore: 0.96,
              captureTimestamp: lastWeek
            },
            'source8': {
              url: 'https://www.seia.org/',
              title: 'Solar Energy Industries Association',
              summary: 'Trade association for the U.S. solar industry',
              credibilityScore: 0.88,
              captureTimestamp: lastWeek
            },
            'source9': {
              url: 'https://www.energy.gov/eere/wind',
              title: 'U.S. Department of Energy - Wind Program',
              summary: 'Federal research and development for wind energy',
              credibilityScore: 0.94,
              captureTimestamp: lastWeek
            },
            'source10': {
              url: 'https://gwec.net/',
              title: 'Global Wind Energy Council',
              summary: 'International trade association for the wind power industry',
              credibilityScore: 0.89,
              captureTimestamp: lastWeek
            },
            'source11': {
              url: 'https://www.energy.gov/eere/energy-storage',
              title: 'U.S. Department of Energy - Energy Storage',
              summary: 'Research and development of energy storage technologies',
              credibilityScore: 0.93,
              captureTimestamp: lastWeek
            },
            'source12': {
              url: 'https://www.iea.org/topics/energy-storage',
              title: 'International Energy Agency - Energy Storage',
              summary: 'Analysis and policy recommendations for energy storage',
              credibilityScore: 0.95,
              captureTimestamp: lastWeek
            }
          },
          createdAt: lastWeek,
          format: ReportFormat.MARKDOWN
        }
      };
      
      this.reports = mockReports;
      this.loading = false;
    },
    
    async _mockFetchReportById(id: string) {
      this.loading = true;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if we already have the report
      if (this.reports[id]) {
        this.currentReport = this.reports[id];
        this.loading = false;
        return this.reports[id];
      }
      
      // Mock a fetch from API
      await this._mockFetchReports();
      
      if (this.reports[id]) {
        this.currentReport = this.reports[id];
        return this.reports[id];
      }
      
      this.error = `Report ${id} not found`;
      this.loading = false;
      return null;
    }
  }
});