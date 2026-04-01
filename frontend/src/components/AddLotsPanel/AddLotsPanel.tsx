import { useState } from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { auctionsApi } from '../../services/api';
import { formatCurrency } from '../../utils/format';

interface Props {
  auctionId: string;
  onLotAdded: () => void;
}

export default function AddLotsPanel({ auctionId, onLotAdded }: Props) {
  const [adding, setAdding] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data: vehiclesData } = useVehicles({ limit: 20 });

  const handleAdd = async (vehicleId: string, startingBid: number) => {
    setAdding(vehicleId);
    setMessage(null);
    try {
      await auctionsApi.addLot(auctionId, { vehicleId, startingBid, bidIncrement: 25 });
      setMessage('✓ Lot added');
      onLotAdded();
      setTimeout(() => setMessage(null), 2000);
    } catch (err: any) {
      setMessage(`✗ ${err.response?.data?.error || 'Failed to add lot'}`);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-white text-lg">Add Vehicles to Auction</h3>
        {message && (
          <span className={message.startsWith('✓') ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
            {message}
          </span>
        )}
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {vehiclesData?.data?.map((v: any) => (
          <div key={v.id} className="flex items-center justify-between bg-[#1A1A1A] rounded-lg px-4 py-3">
            <div>
              <p className="text-white text-sm font-medium">
                {v.year} {v.make} {v.model}
              </p>
              <p className="text-[#666] text-xs">{v.damageType} · ACV {formatCurrency(v.actualCashValue)}</p>
            </div>
            <button
              onClick={() => handleAdd(v.id, 500)}
              disabled={adding === v.id}
              className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
            >
              {adding === v.id ? 'Adding...' : '+ Add Lot'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}