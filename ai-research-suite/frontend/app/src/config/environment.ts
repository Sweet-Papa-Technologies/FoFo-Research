export interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
}

export const getEnvironment = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    apiUrl: '', // Use relative URL so proxy works
    wsUrl: isDevelopment ? `ws://${window.location.host}` : `ws://${window.location.host}`,
    isDevelopment
  };
};