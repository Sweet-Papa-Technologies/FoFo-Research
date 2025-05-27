export interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
}

export const getEnvironment = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Use relative URL so the proxy works for both HTTP and WebSocket
  // The proxy in quasar.config.ts handles /socket.io with ws: true
  return {
    apiUrl: '', // Use relative URL so proxy works
    wsUrl: '', // Use relative URL so proxy works for WebSocket too
    isDevelopment
  };
};