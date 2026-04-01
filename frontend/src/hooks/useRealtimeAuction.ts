import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsService } from '../services/websocket';
import { auctionKeys } from './useAuction';
import { bidKeys } from './useBids';
import { useAuthStore } from '../store/authStore';

interface BidPlacedEvent {
  lotId: string;
  bidderId: string;
  bidderEmail: string;
  amount: number;
  currentBid: number;
  bidCount: number;
  timestamp: string;
}

interface LotAdvancedEvent {
  previousLot: any;
  currentLot: any;
}

interface UseRealtimeAuctionOptions {
  auctionId: string;
  onBidPlaced?: (event: BidPlacedEvent) => void;
  onLotAdvanced?: (event: LotAdvancedEvent) => void;
  onAuctionEnded?: () => void;
  onParticipantCount?: (count: number) => void;
  onBidConfirmed?: (data: any) => void;
  onBidRejected?: (reason: string) => void;
}

export const useRealtimeAuction = ({
  auctionId,
  onBidPlaced,
  onLotAdvanced,
  onAuctionEnded,
  onParticipantCount,
  onBidConfirmed,
  onBidRejected,
}: UseRealtimeAuctionOptions) => {
  const queryClient = useQueryClient();
  const { tokens } = useAuthStore();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!auctionId || !tokens?.accessToken) return;

    if (!wsService.isConnected) wsService.connect(tokens.accessToken);

    const joinTimeout = setTimeout(() => {
      wsService.joinAuction(auctionId);
      joinedRef.current = true;
    }, 100);

    const unsubBidPlaced = wsService.on<BidPlacedEvent>('bid_placed', (data) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      queryClient.invalidateQueries({ queryKey: bidKeys.byLot(data.lotId) });
      onBidPlaced?.(data);
    });

    const unsubLotUpdated = wsService.on('lot_updated', () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
    });

    const unsubLotAdvanced = wsService.on<LotAdvancedEvent>('lot_advanced', (data) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      if (data.previousLot?.id) queryClient.invalidateQueries({ queryKey: bidKeys.byLot(data.previousLot.id) });
      onLotAdvanced?.(data);
    });

    const unsubAutoAdvanced = wsService.on('lot_auto_advanced', (data: any) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      onLotAdvanced?.(data);
    });

    const unsubAuctionStarted = wsService.on('auction_started', () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
    });

    const unsubAuctionEnded = wsService.on('auction_ended', () => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
      onAuctionEnded?.();
    });

    const unsubParticipantCount = wsService.on('participant_count', ({ count }: { count: number }) => {
      onParticipantCount?.(count);
    });

    const unsubBidConfirmed = wsService.on('bid_confirmed', (data: any) => {
      onBidConfirmed?.(data);
    });

    const unsubBidRejected = wsService.on('bid_rejected', ({ reason }: { reason: string }) => {
      onBidRejected?.(reason);
    });

    return () => {
      clearTimeout(joinTimeout);
      if (joinedRef.current) { wsService.leaveAuction(auctionId); joinedRef.current = false; }
      unsubBidPlaced(); unsubLotUpdated(); unsubLotAdvanced(); unsubAutoAdvanced();
      unsubAuctionStarted(); unsubAuctionEnded(); unsubParticipantCount();
      unsubBidConfirmed(); unsubBidRejected();
    };
  }, [auctionId, tokens?.accessToken]);

  const placeBidViaSocket = useCallback((lotId: string, amount: number) => {
    wsService.placeBid(lotId, amount);
  }, []);

  return { placeBidViaSocket, isConnected: wsService.isConnected };
};

// ── Lot timer state from WebSocket ────────────────────────────────────────────
export interface LotTimerState {
  lotId: string;
  remainingSeconds: number;
  totalSeconds: number;
  endsAt: string;
}

export const useLotTimer = (auctionId: string): LotTimerState | null => {
  const [timerState, setTimerState] = useState<LotTimerState | null>(null);

  useEffect(() => {
    if (!auctionId) return;

    const unsub1 = wsService.on<LotTimerState>('lot_timer', (data) => setTimerState(data));

    const unsub2 = wsService.on('lot_timer_extended', (data: any) => {
      setTimerState(prev => prev ? {
        ...prev,
        remainingSeconds: data.remainingSeconds,
        endsAt: data.newEndsAt,
        totalSeconds: prev.totalSeconds,
      } : null);
    });

    const unsub3 = wsService.on('lot_advanced', () => setTimerState(null));
    const unsub4 = wsService.on('lot_auto_advanced', () => setTimerState(null));
    const unsub5 = wsService.on('auction_ended', () => setTimerState(null));

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [auctionId]);

  return timerState;
};
