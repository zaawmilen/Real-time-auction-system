import type { Vehicle } from '../../types';
import { formatCurrency } from '../../utils/format';
import clsx from 'clsx';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  compact?: boolean;
}

const conditionConfig = {
  run_drive:        { label: 'Run & Drive',  className: 'badge-run-drive' },
  enhanced_vehicle: { label: 'Enhanced',     className: 'badge-enhanced' },
  stationary:       { label: 'Stationary',   className: 'badge-stationary' },
  parts_only:       { label: 'Parts Only',   className: 'badge-parts-only' },
};

export default function VehicleCard({ vehicle, onClick, compact = false }: VehicleCardProps) {
  const condition = conditionConfig[vehicle.condition] ?? { label: vehicle.condition, className: 'badge-condition bg-gray-800 text-gray-300' };
  const primaryImage = vehicle.images?.[0];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'card group cursor-pointer hover:border-[#FF6B00]/40 transition-all duration-200',
        'hover:shadow-[0_0_24px_rgba(255,107,0,0.08)]',
        compact ? 'p-4' : 'p-0 overflow-hidden'
      )}
    >
      {!compact && (
        <div className="relative h-44 bg-[#1A1A1A] overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#444]">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2z" />
              </svg>
            </div>
          )}
          {vehicle.lotNumber && (
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs font-mono px-2 py-1 rounded">
              {vehicle.lotNumber}
            </div>
          )}
          <div className={clsx('absolute top-3 right-3', condition.className)}>
            {condition.label}
          </div>
        </div>
      )}

      <div className={compact ? '' : 'p-5'}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display font-bold text-white text-lg leading-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            {vehicle.trim && (
              <p className="text-[#888] text-sm">{vehicle.trim}</p>
            )}
          </div>
          {compact && (
            <span className={condition.className}>{condition.label}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
          <div>
            <span className="text-[#666]">Odometer</span>
            <p className="text-white font-medium">
              {vehicle.odometer != null
                ? `${vehicle.odometer.toLocaleString()} mi`
                : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-[#666]">Damage</span>
            <p className="text-white font-medium truncate">{vehicle.damageType || 'N/A'}</p>
          </div>
          <div>
            <span className="text-[#666]">Keys</span>
            <p className={clsx('font-medium', vehicle.keysAvailable ? 'text-green-400' : 'text-[#888]')}>
              {vehicle.keysAvailable ? 'Available' : 'No Keys'}
            </p>
          </div>
          <div>
            <span className="text-[#666]">Location</span>
            <p className="text-white font-medium">
              {[vehicle.locationCity, vehicle.locationState].filter(Boolean).join(', ') || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-[#2A2A2A]">
          <div>
            <p className="text-[#666] text-xs mb-0.5">Est. Repair</p>
            <p className="text-yellow-400 font-mono font-semibold">
              {vehicle.estimatedRepair != null
                ? formatCurrency(vehicle.estimatedRepair)
                : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[#666] text-xs mb-0.5">Actual Value</p>
            <p className="text-white font-mono font-bold text-lg">
              {vehicle.actualCashValue != null
                ? formatCurrency(vehicle.actualCashValue)
                : '—'}
            </p>
          </div>
        </div>

        {vehicle.currentLot && (
          <div className="mt-3 flex items-center justify-between bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-lg px-3 py-2">
            <span className="text-[#FF6B00] text-xs font-semibold uppercase tracking-wide">
              Current Bid
            </span>
            <span className="text-[#FF6B00] font-mono font-bold">
              {formatCurrency(vehicle.currentLot.currentBid)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
