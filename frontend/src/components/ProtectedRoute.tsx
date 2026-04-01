import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { wsService } from '../services/websocket';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const {user, fetchMe, tokens, isLoading } = useAuthStore();

  useEffect(() => {
    // Only fetch user profile if we have tokens but no user object yet
    if (tokens && !user) {
      fetchMe();
    }
    // Reconnect WebSocket if needed
    if (tokens?.accessToken && !wsService.isConnected) {
      wsService.connect(tokens.accessToken);
    }
  }, [tokens, user]);

  // While we have tokens but are still fetching the user profile,
  // avoid immediately redirecting back to login (prevents flicker).
  if (tokens && isLoading) {
    return null;
  }

  if (!tokens) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}