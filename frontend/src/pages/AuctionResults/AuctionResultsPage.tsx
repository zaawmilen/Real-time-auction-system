import { useParams, Link } from 'react-router-dom';
import { useAuction } from '../../hooks/useAuction';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Lot } from '../../types';

export default function AuctionResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { data: auction, isLoading } = useAuction(id!);

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-[#888] animate-pulse">Loading results...</div>
    </div>
  );

  if (!auction) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white mb-4">Auction not found</p>
        <Link to="/auctions" className="btn-primary">Back to Auctions</Link>
      </div>
    </div>
  );

  const lots: Lot[] = auction.lots || [];
  const soldLots = lots.filter((l: Lot) => l.status === 'sold');
  const noSaleLots = lots.filter((l: Lot) => l.status === 'no_sale');
  const saleRate = lots.length > 0 ? Math.round((soldLots.length / lots.length) * 100) : 0;
  const totalSales = soldLots.reduce((sum, l) => sum + (l.soldPrice || 0), 0);
  const avgSalePrice = soldLots.length > 0 ? totalSales / soldLots.length : 0;
  const highestSale = soldLots.reduce((max, l) => Math.max(max, l.soldPrice || 0), 0);
  const totalBids = lots.reduce((sum, l) => sum + l.bidCount, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/auctions" className="text-[#888] hover:text-white text-sm">← Auctions</Link>
            <div className="h-4 w-px bg-[#2A2A2A]" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="font-display font-bold text-white truncate max-w-xs">{auction.title}</span>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider text-[#888] bg-[#1A1A1A] border-[#2A2A2A]">
            Completed
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero banner */}
        <div className="bg-gradient-to-br from-[#141414] to-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 mb-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B00]/5 to-transparent pointer-events-none" />
          <div className="w-16 h-16 bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-white text-4xl mb-2">Auction Complete</h1>
          <p className="text-[#888]">
            {auction.location && <span>{auction.location} · </span>}
            {auction.auctionDate && format(new Date(auction.auctionDate), 'MMMM d, yyyy')}
          </p>
          <div className="mt-6">
            <p className="text-[#666] text-sm mb-1">Total Sales</p>
            <p className="font-display font-bold text-[#FF6B00] text-5xl">{formatCurrency(totalSales)}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Lots', value: lots.length, color: 'text-white' },
            { label: 'Sold', value: soldLots.length, sub: `${saleRate}% sale rate`, color: 'text-green-400' },
            { label: 'Avg Sale Price', value: formatCurrency(avgSalePrice), color: 'text-white' },
            { label: 'Top Sale', value: formatCurrency(highestSale), color: 'text-[#FF6B00]' },
            { label: 'No Sale', value: noSaleLots.length, color: 'text-red-400' },
            { label: 'Total Bids', value: totalBids.toLocaleString(), color: 'text-white' },
            { label: 'Avg Bids/Lot', value: lots.length ? Math.round(totalBids / lots.length) : 0, color: 'text-white' },
            { label: 'Buyers', value: new Set(soldLots.map(l => l.soldTo).filter(Boolean)).size, color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-4">
              <p className="text-[#666] text-xs mb-1">{s.label}</p>
              <p className={clsx('font-display font-bold text-xl', s.color)}>{s.value}</p>
              {s.sub && <p className="text-[#555] text-xs mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>

        {/* Sale rate bar */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Sale Rate</h3>
            <span className="text-[#FF6B00] font-mono font-bold text-lg">{saleRate}%</span>
          </div>
          <div className="h-3 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-full transition-all duration-700"
              style={{ width: `${saleRate}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#555]">
            <span>{soldLots.length} sold</span>
            <span>{noSaleLots.length} no sale</span>
          </div>
        </div>

        {/* Sold lots */}
        {soldLots.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display font-bold text-white text-xl mb-4 flex items-center gap-3">
              Sold Lots
              <span className="text-sm bg-green-900/30 text-green-400 px-3 py-1 rounded-full font-normal">
                {soldLots.length} vehicles
              </span>
            </h2>
            <div className="space-y-3">
              {soldLots
                .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
                .map((lot, i) => (
                  <div key={lot.id}
                    className="bg-[#141414] border border-green-800/30 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Rank badge */}
                      <div className={clsx(
                        'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0',
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400'
                          : i === 1 ? 'bg-[#888]/20 text-[#888]'
                          : i === 2 ? 'bg-orange-800/20 text-orange-600'
                          : 'bg-[#1A1A1A] text-[#555]'
                      )}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>

                      {/* Vehicle image thumbnail */}
                      {lot.vehicle?.images?.[0] && (
                        <img src={lot.vehicle.images[0]} alt=""
                          className="w-14 h-10 object-cover rounded-lg flex-shrink-0 hidden sm:block" />
                      )}

                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {lot.vehicle
                            ? `${lot.vehicle.year} ${lot.vehicle.make} ${lot.vehicle.model}`
                            : `Lot ${lot.lotOrder}`}
                        </p>
                        <p className="text-[#666] text-xs mt-0.5">
                          {lot.vehicle?.damageType && <span>{lot.vehicle.damageType} · </span>}
                          {lot.bidCount} bids
                          {lot.vehicle?.actualCashValue && (
                            <span> · ACV {formatCurrency(lot.vehicle.actualCashValue)}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-mono font-bold text-xl text-green-400">{formatCurrency(lot.soldPrice!)}</p>
                      {lot.vehicle?.actualCashValue && (
                        <p className="text-xs text-[#555] mt-0.5">
                          {Math.round((lot.soldPrice! / lot.vehicle.actualCashValue) * 100)}% of ACV
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* No sale lots */}
        {noSaleLots.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-white text-xl mb-4 flex items-center gap-3">
              No Sale
              <span className="text-sm bg-red-900/20 text-red-400 px-3 py-1 rounded-full font-normal">
                {noSaleLots.length} vehicles
              </span>
            </h2>
            <div className="space-y-2">
              {noSaleLots.map(lot => (
                <div key={lot.id}
                  className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-5 py-3.5 flex items-center justify-between opacity-60">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {lot.vehicle
                        ? `${lot.vehicle.year} ${lot.vehicle.make} ${lot.vehicle.model}`
                        : `Lot ${lot.lotOrder}`}
                    </p>
                    <p className="text-[#555] text-xs">{lot.bidCount} bids · Reserve not met</p>
                  </div>
                  <span className="text-red-400 text-xs font-bold">NO SALE</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Back CTA */}
        <div className="mt-10 text-center">
          <Link to="/auctions" className="btn-primary px-8 py-3 text-base">
            Browse More Auctions →
          </Link>
        </div>
      </main>
    </div>
  );
}
