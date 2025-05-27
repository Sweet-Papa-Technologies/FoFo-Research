import { boot } from 'quasar/wrappers';
import { wsService } from '../api/websocket/WebSocketService';
import { useAuthStore } from '../stores/auth';

export default boot( ({ router }) => {
  const authStore = useAuthStore();

  // Don't connect WebSocket on initial load - wait for auth

  // Handle WebSocket reconnection on auth state change
  authStore.$subscribe((mutation, state) => {
    if (state.isAuthenticated && !wsService.isConnected()) {
      wsService.connect().catch(console.error);
    } else if (!state.isAuthenticated && wsService.isConnected()) {
      wsService.disconnect();
    }
  });

  // Disconnect WebSocket on logout
  router.beforeEach((to, from, next) => {
    if (to.path === '/login' && wsService.isConnected()) {
      wsService.disconnect();
    }
    next();
  });
});
