import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { wsService } from './services/websocket';
import { useToast } from './components/Toast/Toast';
import LoginPage from './pages/Login/LoginPage';
import AuctionsPage from './pages/Auctions/AuctionsPage';
import AuctionRoomPage from './pages/AuctionRoom/AuctionRoomPage';
import ProtectedRoute from './components/ProtectedRoute';
import MyBidsPage from './pages/MyBids/MyBidsPage';
import RegisterPage from './pages/Register/RegisterPage';
import AuctionResultsPage from './pages/AuctionResults/AuctionResultsPage';
    
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  const toast = useToast();

  useEffect(() => {
    const unsub = wsService.on<any>('you_were_outbid', (data) => {
      const title = 'Outbid';
      const message = data?.lotId ? `You were outbid on lot ${data.lotId} — new bid $${data.newCurrentBid}` : `You were outbid.`;
      toast.bid(title, message);
    });
    return () => unsub();
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auctions" element={
            <ProtectedRoute><AuctionsPage /></ProtectedRoute>
          } />
          <Route path="/auctions/:id" element={
            <ProtectedRoute><AuctionRoomPage /></ProtectedRoute>
          } />
          <Route path="/my-bids" element={
            <ProtectedRoute><MyBidsPage /></ProtectedRoute>
          } />
          <Route path="/auctions/:id/results" element={
            <ProtectedRoute><AuctionResultsPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/auctions" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
