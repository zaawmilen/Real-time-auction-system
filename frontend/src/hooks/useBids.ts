import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bidsApi } from '../services/api';
import type { Bid } from '../types';

export const bidKeys = {
  byLot: (lotId: string) => ['bids', 'lot', lotId] as const,
  my: () => ['bids', 'my'] as const,
};

export const useLotBids = (lotId: string) => {
  return useQuery<Bid[]>({
    queryKey: bidKeys.byLot(lotId),
    queryFn: async () => {
      const { data } = await bidsApi.getByLot(lotId);
      return data.data || [];
    },
    enabled: !!lotId,
    refetchInterval: 10000,
  });
};

export const useMyBids = () => {
  return useQuery<Bid[]>({
    queryKey: bidKeys.my(),
    queryFn: async () => {
      const { data } = await bidsApi.getMyBids();
      return data.data || [];
    },
    staleTime: 10_000,
  });
};

export const usePlaceBid = (lotId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => bidsApi.place({ lotId, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bidKeys.byLot(lotId) });
      queryClient.invalidateQueries({ queryKey: bidKeys.my() });
    },
  });
};
