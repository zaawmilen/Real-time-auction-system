import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { auctionsApi } from '../services/api';
import { wsService } from '../services/websocket';
import type { Auction, BidPlacedEvent, LotAdvancedEvent } from '../types';

export const auctionKeys = {
  all: ['auctions'] as const,
  lists: () => [...auctionKeys.all, 'list'] as const,
  list: (status?: string) => [...auctionKeys.lists(), status] as const,
  detail: (id: string) => [...auctionKeys.all, 'detail', id] as const,
};

export const useAuctions = (status?: string) => {
  return useQuery<Auction[]>({
    queryKey: auctionKeys.list(status),
    queryFn: async () => {
      const { data } = await auctionsApi.getAll(status ? { status } : {});
      return data.data || [];
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
};

export const useAuction = (id: string) => {
  return useQuery<Auction>({
    queryKey: auctionKeys.detail(id),
    queryFn: async () => {
      const { data } = await auctionsApi.getById(id);
      return data;
    },
    enabled: !!id,
    refetchInterval: 30000,
  });
};

export const useCreateAuction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => auctionsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: auctionKeys.lists() }),
  });
};

export const useStartAuction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auctionId: string) => auctionsApi.start(auctionId),
    onSuccess: (_, auctionId) => queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) }),
  });
};

export const useAdvanceLot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auctionId: string) => auctionsApi.advance(auctionId),
    onSuccess: (_, auctionId) => queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) }),
  });
};

export const useEndAuction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auctionId: string) => auctionsApi.end(auctionId),
    onSuccess: (_, auctionId) => {
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(auctionId) });
      queryClient.invalidateQueries({ queryKey: auctionKeys.lists() });
    },
  });
};

export const useAuctionRoom = (auctionId: string) => {
  const [lastBid, setLastBid] = useState<BidPlacedEvent | null>(null);
  const [lastAdvance, setLastAdvance] = useState<LotAdvancedEvent | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  const auctionQuery = useAuction(auctionId);

  useEffect(() => {
    if (!auctionId) return;
    wsService.joinAuction(auctionId);
    const unsub1 = wsService.on('bid_placed', (data) => setLastBid(data));
    const unsub2 = wsService.on('lot_advanced', (data) => setLastAdvance(data));
    const unsub3 = wsService.on('participant_count', (data) => setParticipantCount(data.count));
    return () => { wsService.leaveAuction(auctionId); unsub1(); unsub2(); unsub3(); };
  }, [auctionId]);

  return {
    auction: auctionQuery.data,
    isLoading: auctionQuery.isLoading,
    lastBid,
    lastAdvance,
    participantCount,
  };
};