import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import CountdownTimer from '../CountdownTimer/CountdownTimer';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import type { Auction } from '../../types';

interface AuctionCardProps {
  auction: Auction;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  const navigate = useNavigate();
  const isLive = auction.status === 'live';
  const isCompleted = auction.status === 'completed';
  const isScheduled = auction.status === 'scheduled';
  const lotCount = Number(auction.lotCount ?? 0);
  const soldCount = Number(auction.soldCount ?? 0);
  const pct = lotCount >0 ?  Math.round((soldCount / lotCount) * 100) : 0;
 

  const goToRoom = () => navigate(`/auctions/${auction.id}`);
  const goToResults = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

          if (!auction?.id) {
          console.log("NO AUCTION ID");
          return;
        }
        navigate(`/auctions/${auction.id}/results`);
      };

  return (
    <div
      onClick={goToRoom}
      className={clsx(
        'group bg-[#141414] border rounded-2xl overflow-hidden cursor-pointer',
        'transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl',
        isLive
          ? 'border-[#FF6B00]/40 hover:border-[#FF6B00]/70 shadow-[0_0_20px_rgba(255,107,0,0.08)]'
          : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
      )}
    >
      {/* Top accent bar */}
      <div className={clsx('h-1 w-full',
        isLive ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8C00]'
          : isCompleted ? 'bg-gradient-to-r from-green-700 to-green-500'
          : 'bg-gradient-to-r from-blue-800 to-blue-600'
      )} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-white text-lg leading-tight group-hover:text-[#FF6B00] transition-colors truncate">
              {auction.title}
            </h3>
            {auction.location && (
              <p className="text-[#666] text-sm mt-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {auction.location}
              </p>
            )}
          </div>
          <span className={clsx(
            'flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider flex items-center gap-1.5',
            isLive ? 'text-green-400 bg-green-900/30 border-green-700'
              : isCompleted ? 'text-[#888] bg-[#1A1A1A] border-[#2A2A2A]'
              : 'text-blue-400 bg-blue-900/30 border-blue-800'
          )}>
            {isLive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
            {auction.status}
          </span>
        </div>

        {/* Date + countdown */}
        <div className="flex items-center justify-between mb-4 py-3 border-y border-[#1E1E1E]">
          <div>
            <p className="text-[#555] text-xs uppercase tracking-wider">
              {isLive ? 'Started' : isCompleted ? 'Ended' : 'Starts'}
            </p>
            <p className="text-white text-sm font-medium mt-0.5">
              {format(new Date(auction.auctionDate), 'MMM d, yyyy · h:mm a')}
            </p>
          </div>
          {isScheduled && (
            <div className="text-right">
              <p className="text-[#555] text-xs uppercase tracking-wider">Countdown</p>
              <CountdownTimer targetDate={auction.auctionDate} className="text-sm mt-0.5" />
            </div>
          )}
          {isLive && (
            <div className="flex items-center gap-1.5 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-semibold">Live Now</span>
            </div>
          )}
          {isCompleted && (auction.totalSales || 0) > 0 && (
            <div className="text-right">
              <p className="text-[#555] text-xs uppercase tracking-wider">Total Sales</p>
              <p className="text-[#FF6B00] font-mono font-bold text-sm mt-0.5">
                {formatCurrency(auction.totalSales || 0)}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Lots', value: auction.lotCount },
            { label: 'Sold', value: auction.soldCount, highlight: soldCount > 0 }, //
            { label: 'Sale %', value: `${pct}%`, highlight: pct > 50 },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="bg-[#1A1A1A] rounded-xl p-3 text-center">
              <p className="text-[#555] text-xs mb-1">{label}</p>
              <p className={clsx('font-display font-bold text-lg', highlight ? 'text-[#FF6B00]' : 'text-white')}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {(isLive || isCompleted) && lotCount > 0 && ( 
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#666] mb-1.5">
              <span>{auction.soldCount ?? 0} sold</span>
              <span>{(auction.lotCount  ?? 0) - (auction.soldCount ?? 0)} remaining</span>
            </div>
            <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* CTA */}
        {isCompleted ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={goToResults}
              className="py-2.5 rounded-xl font-semibold text-sm bg-[#FF6B00] text-white hover:bg-[#FF8C00] transition-colors">
              📊 Results
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/auctions/${auction.id}`); }}
              className="py-2.5 rounded-xl font-semibold text-sm bg-[#1A1A1A] text-[#888] hover:text-white border border-[#2A2A2A] transition-colors">
              View Room
            </button>
          </div>
        ) : (
          <button className={clsx(
            'w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
            isLive
              ? 'bg-[#FF6B00] text-white hover:bg-[#FF8C00]'
              : 'border border-[#3A3A3A] text-[#888] hover:border-blue-600 hover:text-blue-400'
          )}>
            {isLive ? '🔨 Join Live Auction' : 'View Details →'}
          </button>
        )}
      </div>
    </div>
  );
}
