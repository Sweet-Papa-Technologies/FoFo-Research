export interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
}

export const getEnvironment = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    apiUrl: isDevelopment ? 'http://localhost:80' : window.location.origin,
    wsUrl: isDevelopment ? 'ws://localhost:80' : `ws://${window.location.host}`,
    isDevelopment
  };
};