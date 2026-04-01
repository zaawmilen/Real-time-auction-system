import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { vehiclesApi } from '../services/api';
import type { Vehicle, PaginatedResponse, VehicleFilters } from '../types';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (filters: VehicleFilters) => [...vehicleKeys.lists(), filters] as const,
  details: () => [...vehicleKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleKeys.details(), id] as const,
  stats: () => [...vehicleKeys.all, 'stats'] as const,
};

export const useVehicles = (filters: VehicleFilters = {}) => {
  return useQuery<PaginatedResponse<Vehicle>>({
    queryKey: vehicleKeys.list(filters),
    queryFn: async () => {
      const { data } = await vehiclesApi.getAll(filters as Record<string, unknown>);
      return data;
    },
    staleTime: 30_000,
  });
};

export const useVehicle = (id: string) => {
  return useQuery<Vehicle>({
    queryKey: vehicleKeys.detail(id),
    queryFn: async () => {
      const { data } = await vehiclesApi.getById(id);
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

export const useVehicleStats = () => {
  return useQuery({
    queryKey: vehicleKeys.stats(),
    queryFn: async () => {
      const { data } = await vehiclesApi.getStats();
      return data;
    },
    staleTime: 60_000,
  });
};
