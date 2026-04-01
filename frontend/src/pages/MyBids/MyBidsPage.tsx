import { Link, useNavigate } from 'react-router-dom';
import { useMyBids } from '../../hooks/useBids';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function MyBidsPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: bids, isLoading } = useMyBids(); 
  const wonBids = bids?.filter(b => b.status === 'winning' && b.lotStatus === 'sold') || [];
  const activeBids = bids?.filter(b => b.status === 'winning' && b.lotStatus === 'active') || [];
  const lostBids = bids?.filter(b => b.status === 'lost') || [];
  const totalSpent = wonBids.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/auctions" className="text-[#888] hover:text-white text-sm transition-colors">← Auctions</Link>
            <div className="h-4 w-px bg-[#2A2A2A]" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">C</span>
              </div>
              <span className="font-display font-bold text-white">My Bids</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-[#666] text-xs">{user?.buyerNumber}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="btn-secondary text-sm py-2 px-4">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Bids', value: bids?.length || 0, color: 'text-white' },
            { label: 'Vehicles Won', value: wonBids.length, color: 'text-green-400' },
            { label: 'Active Bids', value: activeBids.length, color: 'text-[#FF6B00]' },
            { label: 'Total Spent', value: formatCurrency(totalSpent), color: 'text-[#FF6B00]' },
          ].map(s => (
            <div key={s.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-5 py-4">
              <p className="text-[#666] text-xs mb-1">{s.label}</p>
              <p className={clsx('font-display font-bold text-2xl', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : !bids?.length ? (
          <div className="card flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">No bids yet</h3>
            <p className="text-[#888] mb-5">Join a live auction to start bidding</p>
            <Link to="/auctions" className="btn-primary">Browse Auctions</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active / Winning bids */}
            {activeBids.length > 0 && (
              <Section title="Active Bids" badge={activeBids.length} badgeColor="bg-[#FF6B00]/20 text-[#FF6B00]">
                {activeBids.map(bid => <BidRow key={bid.id} bid={bid} status="winning" />)}
              </Section>
            )}

            {/* Won */}
            {wonBids.length > 0 && (
              <Section title="Won" badge={wonBids.length} badgeColor="bg-green-900/30 text-green-400">
                {wonBids.map(bid => <BidRow key={bid.id} bid={bid} status="won" />)}
              </Section>
            )}

            {/* Outbid */}
            {lostBids.length > 0 && (
              <Section title="Outbid" badge={lostBids.length} badgeColor="bg-[#1A1A1A] text-[#888]">
                {lostBids.map(bid => <BidRow key={bid.id} bid={bid} status="outbid" />)}
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ title, badge, badgeColor, children }: {
  title: string;
  badge: number;
  badgeColor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display font-bold text-white text-lg">{title}</h2>
        <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full', badgeColor)}>{badge}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function BidRow({ bid, status }: { bid: any; status: 'winning' | 'won' | 'outbid' }) {
  const statusConfig = {
    winning: { label: '● WINNING', color: 'text-[#FF6B00]', bg: 'bg-[#FF6B00]/5 border-[#FF6B00]/30' },
    won: { label: '✓ WON', color: 'text-green-400', bg: 'bg-green-900/10 border-green-800/30' },
    outbid: { label: '✗ OUTBID', color: 'text-[#555]', bg: 'bg-[#141414] border-[#2A2A2A]' },
  }[status];

  return (
    <div className={clsx('border rounded-xl px-5 py-4 flex items-center justify-between gap-4', statusConfig.bg)}>
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 bg-[#1A1A1A] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2z" />
          </svg>
        </div>
        <div className="min-w-0">
          {bid.vehicle ? (
            <p className="text-white font-semibold text-sm truncate">
              {bid.vehicle.year} {bid.vehicle.make} {bid.vehicle.model}
            </p>
          ) : (
            <p className="text-[#888] text-sm">Lot #{bid.lotOrder}</p>
          )}
          <p className="text-[#666] text-xs mt-0.5">
            {bid.auctionTitle && <span>{bid.auctionTitle} · </span>}
            {bid.createdAt && format(new Date(bid.createdAt), 'MMM d, h:mm a')}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-mono font-bold text-lg text-white">{formatCurrency(bid.amount)}</p>
        <p className={clsx('text-xs font-bold', statusConfig.color)}>{statusConfig.label}</p>
      </div>
    </div>
  );
}
