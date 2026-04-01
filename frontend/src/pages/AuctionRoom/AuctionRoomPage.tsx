import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuction, useStartAuction, useAdvanceLot, useEndAuction, auctionKeys } from '../../hooks/useAuction';
import { useLotBids, usePlaceBid } from '../../hooks/useBids';
import { useRealtimeAuction, useLotTimer } from '../../hooks/useRealtimeAuction';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/Toast/Toast';
import AiPanel from '../../components/AiPanel/AiPanel';
import AddLotsPanel from '../../components/AddLotsPanel/AddLotsPanel';
import LotCountdown from '../../components/LotCountdown/LotCountdown';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';
import clsx from 'clsx';
import type { Lot } from '../../types';

// ── Elapsed time counter (how long lot has been live) ──────────────────
function LotTimer({ startedAt }: { startedAt: string | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
      <span className="font-mono text-sm text-green-400 tabular-nums">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <span className="text-[#555] text-xs">elapsed</span>
    </div>
  );
}

export default function AuctionRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [controlMsg, setControlMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const bidFeedRef = useRef<HTMLDivElement>(null);

  const { data: auction, isLoading } = useAuction(id!);
  const { mutate: startAuction, isPending: isStarting } = useStartAuction();
  const { mutate: advanceLot, isPending: isAdvancing } = useAdvanceLot();
  const { mutate: endAuction, isPending: isEnding } = useEndAuction();

  const activeLot: Lot | null = auction?.lots?.find((l: Lot) => l.status === 'active') || null;
  const { data: bidHistory } = useLotBids(activeLot?.id || '');
  const { mutate: placeBidREST, isPending: isBidding } = usePlaceBid(activeLot?.id || '');
  const timerState = useLotTimer(id!);

  useEffect(() => { setActiveImageIdx(0); }, [activeLot?.id]);
   // Reset image index when lot changes
  const { placeBidViaSocket, isConnected } = useRealtimeAuction({
    auctionId: id!,
    onBidPlaced: (event) => {
      setRecentBids(prev => [event, ...prev].slice(0, 20));
      if (bidFeedRef.current) bidFeedRef.current.scrollTop = 0;
      const isMe = event.bidderId === user?.id;
      if (!isMe) toast.bid(`New bid: ${formatCurrency(event.amount)}`, event.bidderEmail?.split('@')[0]);
    },
    onLotAdvanced: (data) => {
      setRecentBids([]);
      setCustomAmount('');
      if (data.previousLot?.status === 'sold') toast.success(`Lot ${data.previousLot.lot_order} sold!`, formatCurrency(data.previousLot.sold_price));
      if (data.currentLot) toast.info(`Lot ${data.currentLot.lot_order} now active`);
    },
    onAuctionEnded: () => toast.info('Auction has ended'),
    onParticipantCount: setParticipantCount,
    onBidConfirmed: (data) => {
      toast.success('Bid confirmed!', formatCurrency(data.currentBid));
      queryClient.invalidateQueries({ queryKey: auctionKeys.detail(id!) });
    },
    onBidRejected: (reason) => toast.error('Bid rejected', reason),
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'auctioneer';
  const isLive = auction?.status === 'live';
  const lots: Lot[] = auction?.lots || [];
  const soldLots = lots.filter((l: Lot) => l.status === 'sold');
  const pendingLots = lots.filter((l: Lot) => l.status === 'pending');

  const currentBid = activeLot?.currentBid || 0;
  const increment = activeLot?.bidIncrement || 25;
  const nextMin = currentBid === 0 ? (activeLot?.startingBid || 0) : currentBid + increment;
  const quickBids = activeLot ? [nextMin, nextMin + increment, nextMin + increment * 3] : [];
  const images = activeLot?.vehicle?.images || [];

  const handleBid = (amount: number) => {
    if (isConnected) {
      placeBidViaSocket(activeLot!.id, amount);
      setCustomAmount('');
    } else {
      placeBidREST(amount, {
        onSuccess: () => {
          toast.success('Bid placed!', formatCurrency(amount));
          setCustomAmount('');
          queryClient.invalidateQueries({ queryKey: auctionKeys.detail(id!) });
        },
        onError: (e: any) => toast.error('Bid failed', e.response?.data?.error),
      });
    }
  };

  const handleControl = (action: 'start' | 'advance' | 'end') => {
    setControlMsg(null);
    if (action === 'start') {
      startAuction(id!, {
        onSuccess: () => { setControlMsg({ text: '✓ Auction started', ok: true }); toast.success('Auction started!'); },
        onError: (e: any) => setControlMsg({ text: e.response?.data?.error || 'Failed', ok: false }),
      });
    } else if (action === 'advance') {
      advanceLot(id!, {
        onSuccess: (data: any) => setControlMsg({ text: data.data?.message || 'Advanced', ok: true }),
        onError: (e: any) => setControlMsg({ text: e.response?.data?.error || 'Failed', ok: false }),
      });
    } else {
      endAuction(id!, {
        onSuccess: () => { setControlMsg({ text: '✓ Auction ended', ok: true }); toast.info('Auction completed'); },
        onError: (e: any) => setControlMsg({ text: e.response?.data?.error || 'Failed', ok: false }),
      });
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-[#888] animate-pulse">Loading auction room...</div>
    </div>
  );

  if (!auction) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white mb-4">Auction not found</p>
        <Link to="/auctions" className="btn-primary">← Back</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link to="/auctions" className="text-[#888] hover:text-white flex-shrink-0 text-sm">← Back</Link>
            <div className="h-4 w-px bg-[#2A2A2A]" />
            <h1 className="font-display font-bold text-white text-lg truncate">{auction.title}</h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className={clsx('w-2 h-2 rounded-full', isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500')} />
              <span className="text-xs text-[#666]">{isConnected ? 'Live' : 'Connecting...'}</span>
            </div>
            {participantCount > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 text-sm text-[#888]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {participantCount}
              </span>
            )}
            {(auction.totalSales || 0) > 0 && (
              <span className="hidden sm:block text-[#FF6B00] font-mono font-semibold text-sm">
                {formatCurrency(auction.totalSales || 0)}
              </span>
            )}
            <span className={clsx(
              'text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider flex items-center gap-1.5',
              isLive ? 'text-green-400 bg-green-900/30 border-green-700'
                : auction.status === 'completed' ? 'text-[#888] bg-[#1A1A1A] border-[#2A2A2A]'
                : 'text-blue-400 bg-blue-900/30 border-blue-800'
            )}>
              {isLive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
              {auction.status}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Auctioneer controls */}
        {isAdmin && (
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
            <span className="text-[#555] text-xs font-semibold uppercase tracking-wider">Auctioneer</span>
            {auction.status === 'scheduled' && (
              <AddLotsPanel auctionId={id!} onLotAdded={() => queryClient.invalidateQueries({ queryKey: auctionKeys.detail(id!) })} />
            )}
            {auction.status === 'scheduled' && (
              <button onClick={() => handleControl('start')} disabled={isStarting}
                className="btn-primary py-2 px-5 text-sm">
                {isStarting ? 'Starting...' : '▶ Start Auction'}
              </button>
            )}
            {isLive && (
              <>
                <button onClick={() => handleControl('advance')} disabled={isAdvancing}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                  {isAdvancing ? '...' : '⏭ Next Lot'}
                </button>
                <button onClick={() => handleControl('end')} disabled={isEnding}
                  className="bg-red-800 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                  {isEnding ? '...' : '⏹ End Auction'}
                </button>
              </>
            )}
            {controlMsg && (
              <span className={clsx('text-sm font-medium', controlMsg.ok ? 'text-green-400' : 'text-red-400')}>
                {controlMsg.text}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Active lot ───────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            {activeLot ? (
              <>
                {/* Live badge + elapsed timer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="auction-status-live"><span className="live-dot" /> LIVE</span>
                    <span className="text-[#888] text-sm">Lot {activeLot.lotOrder} of {lots.length}</span>
                    {activeLot.vehicle?.lotNumber && (
                      <span className="text-[#555] font-mono text-xs bg-[#1A1A1A] px-2 py-0.5 rounded">
                        {activeLot.vehicle.lotNumber}
                      </span>
                    )}
                  </div>
                  <LotTimer startedAt={activeLot.startedAt} />
                </div>

                {/* Vehicle card */}
                {activeLot.vehicle && (
                  <div className="card p-0 overflow-hidden">
                    <div className="relative h-64 bg-[#1A1A1A]">
                      {images.length > 0 ? (
                        <>
                          <img src={images[activeImageIdx]} alt="vehicle" className="w-full h-full object-cover" />
                          {images.length > 1 && (
                            <>
                              <button onClick={() => setActiveImageIdx(i => (i - 1 + images.length) % images.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">‹</button>
                              <button onClick={() => setActiveImageIdx(i => (i + 1) % images.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">›</button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-[#333]">
                          <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.75}
                              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h10l2-2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                        <p className="text-white font-display font-bold text-2xl drop-shadow-lg">
                          {activeLot.vehicle.year} {activeLot.vehicle.make} {activeLot.vehicle.model}
                        </p>
                        {activeLot.vehicle.trim && <p className="text-white/70 text-sm">{activeLot.vehicle.trim}</p>}
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Damage', value: activeLot.vehicle.damageType, warn: true },
                          { label: 'Odometer', value: activeLot.vehicle.odometer ? `${activeLot.vehicle.odometer.toLocaleString()} mi` : 'N/A' },
                          { label: 'Keys', value: activeLot.vehicle.keysAvailable ? '✓ Yes' : '✗ No', good: activeLot.vehicle.keysAvailable },
                          { label: 'Title', value: activeLot.vehicle.titleType },
                          { label: 'Engine', value: activeLot.vehicle.engineSize },
                          { label: 'Trans', value: activeLot.vehicle.transmission },
                        ].map(({ label, value, warn, good }) => value ? (
                          <div key={label} className="bg-[#1A1A1A] rounded-lg px-3 py-2.5">
                            <p className="text-[#555] text-xs mb-0.5">{label}</p>
                            <p className={clsx('font-medium text-sm truncate',
                              warn ? 'text-yellow-400' : good === true ? 'text-green-400' : good === false ? 'text-red-400' : 'text-white'
                            )}>{value}</p>
                          </div>
                        ) : null)}
                      </div>
                      <div className="flex gap-4 pt-3 border-t border-[#2A2A2A]">
                        <div>
                          <p className="text-[#555] text-xs">Est. Repair</p>
                          <p className="text-yellow-400 font-mono font-bold text-lg">
                            {activeLot.vehicle.estimatedRepair ? formatCurrency(activeLot.vehicle.estimatedRepair) : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#555] text-xs">ACV</p>
                          <p className="text-white font-mono font-bold text-lg">
                            {activeLot.vehicle.actualCashValue ? formatCurrency(activeLot.vehicle.actualCashValue) : '—'}
                          </p>
                        </div>
                        {activeLot.vehicle.actualCashValue && activeLot.vehicle.estimatedRepair && (
                          <div>
                            <p className="text-[#555] text-xs">Net Value</p>
                            <p className="text-green-400 font-mono font-bold text-lg">
                              {formatCurrency(activeLot.vehicle.actualCashValue - activeLot.vehicle.estimatedRepair)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Panel */}
                <AiPanel lot={activeLot} onUseSuggestion={(amount) => {
                  setCustomAmount(String(amount));
                  toast.info('AI suggestion loaded', `Max bid set to ${formatCurrency(amount)}`);
                }} />

                {/* Bid panel */}
                <div className="card">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display font-bold text-white text-xl">Place Bid</h3>
                    <span className={clsx('flex items-center gap-1.5 text-xs',
                      isConnected ? 'text-green-400' : 'text-yellow-400'
                    )}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400')} />
                      {isConnected ? 'WebSocket' : 'REST'}
                    </span>
                  </div>

                  {/* Current bid */}
                  <div className="bg-[#1A1A1A] rounded-xl p-5 mb-4 text-center">
                    <p className="text-[#666] text-sm mb-1">Current Bid</p>
                    <p className="text-[#FF6B00] font-display font-bold text-5xl">
                      {formatCurrency(currentBid)}
                    </p>
                    <p className="text-[#888] text-sm mt-2">
                      {activeLot?.bidCount || 0} bid{activeLot?.bidCount !== 1 ? 's' : ''}
                      {activeLot?.currentBidderName && (
                        <span className="text-[#666]"> · {activeLot.currentBidderName}</span>
                      )}
                    </p>
                    <p className="text-[#555] text-xs mt-1">Min next bid: {formatCurrency(nextMin)}</p>
                  </div>

                  {/* ── Countdown Timer ───────────────────────────── */}
                  {timerState && timerState.lotId === activeLot.id && (
                    <div className="bg-[#1A1A1A] rounded-xl px-5 py-4 mb-5">
                      <LotCountdown
                        endsAt={timerState.endsAt}
                        totalSeconds={timerState.totalSeconds}
                        onExpired={() => {
                          queryClient.invalidateQueries({ queryKey: auctionKeys.detail(id!) });
                        }}
                      />
                    </div>
                  )}

                  {/* Quick bids */}
                  <div className="space-y-2 mb-4">
                    {quickBids.map((amount, i) => (
                      <button key={amount} onClick={() => handleBid(amount)}
                        disabled={!isLive || isBidding}
                        className={clsx(
                          'w-full flex items-center justify-between px-5 py-3.5 rounded-xl border font-semibold',
                          'transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
                          i === 0
                            ? 'bg-[#FF6B00] border-[#FF6B00] text-white hover:bg-[#FF8C00]'
                            : 'bg-[#1A1A1A] border-[#2A2A2A] text-white hover:border-[#FF6B00]/40'
                        )}>
                        <span className="text-sm opacity-70">
                          {i === 0 ? 'Minimum bid' : `+${formatCurrency(amount - currentBid)}`}
                        </span>
                        <span className="font-mono text-lg">{formatCurrency(amount)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom amount */}
                  <div className="flex gap-2">
                    <input type="number"
                      placeholder={`Custom amount (min ${formatCurrency(nextMin)})`}
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      min={nextMin} step={increment}
                      disabled={!isLive || isBidding}
                      className="input flex-1 font-mono"
                    />
                    <button
                      onClick={() => handleBid(parseFloat(customAmount))}
                      disabled={!isLive || !customAmount || parseFloat(customAmount) < nextMin || isBidding}
                      className="btn-secondary px-5 border-[#3A3A3A] hover:border-[#FF6B00] disabled:opacity-40">
                      Bid
                    </button>
                  </div>
                </div>

                {/* Live bid feed */}
                {(recentBids.length > 0 || (bidHistory && bidHistory.length > 0)) && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white">Bid Feed</h3>
                      {recentBids.length > 0 && (
                        <span className="text-xs bg-[#FF6B00]/20 text-[#FF6B00] px-2.5 py-1 rounded-full font-semibold">
                          {recentBids.length} live
                        </span>
                      )}
                    </div>
                    <div ref={bidFeedRef} className="space-y-2 max-h-48 overflow-y-auto">
                      {recentBids.map((bid, i) => (
                        <div key={`live-${bid.timestamp}-${i}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#FF6B00]/10 border border-[#FF6B00]/20">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full animate-pulse" />
                            <span className="text-[#FF6B00] text-xs font-bold">LIVE</span>
                            <span className="text-[#888] text-xs">{bid.bidderEmail?.split('@')[0]}</span>
                          </div>
                          <span className="font-mono font-bold text-[#FF6B00] text-sm">{formatCurrency(bid.amount)}</span>
                        </div>
                      ))}
                      {bidHistory?.slice(0, 8).map((bid: any, i: number) => (
                        <div key={bid.id}
                          className={clsx('flex items-center justify-between py-2 px-3 rounded-lg text-sm',
                            i === 0 && recentBids.length === 0 ? 'bg-[#FF6B00]/10 border border-[#FF6B00]/20' : 'bg-[#1A1A1A]'
                          )}>
                          <div className="flex items-center gap-2">
                            {i === 0 && recentBids.length === 0 && (
                              <span className="text-[#FF6B00] text-xs font-bold">WINNING</span>
                            )}
                            <span className="text-[#888] text-xs">{bid.buyerNumber || 'Bidder'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#555] text-xs">{format(new Date(bid.createdAt), 'h:mm:ss a')}</span>
                            <span className={clsx('font-mono font-bold text-sm',
                              i === 0 && recentBids.length === 0 ? 'text-[#FF6B00]' : 'text-white'
                            )}>{formatCurrency(bid.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card flex flex-col items-center justify-center py-28 text-center">
                {auction.status === 'scheduled' && (
                  <>
                    <div className="w-20 h-20 bg-blue-900/20 rounded-3xl flex items-center justify-center mb-5">
                      <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-2">Auction Not Started</h3>
                    <p className="text-[#888]">Scheduled for {format(new Date(auction.auctionDate), 'MMM d, yyyy · h:mm a')}</p>
                    {isAdmin && <p className="text-[#FF6B00] text-sm mt-3">Use the auctioneer controls above to start</p>}
                  </>
                )}
                {auction.status === 'completed' && (
                  <>
                    <div className="w-20 h-20 bg-green-900/20 rounded-3xl flex items-center justify-center mb-5">
                      <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-2">Auction Completed</h3>
                    <p className="text-[#888]">{soldLots.length} vehicles sold</p>
                    {(auction.totalSales || 0) > 0 && (
                      <p className="text-[#FF6B00] font-mono font-bold text-2xl mt-2">
                        {formatCurrency(auction.totalSales || 0)}
                      </p>
                    )}
                  </>
                )}
                {isLive && (
                  <><h3 className="text-white font-bold text-xl mb-2">No Active Lot</h3>
                  <p className="text-[#888]">All lots processed</p></>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Lot list ────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-white text-lg">Lots ({lots.length})</h3>
              <span className="text-[#666] text-xs">{soldLots.length} sold · {pendingLots.length} pending</span>
            </div>

            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {lots.map((lot: Lot) => (
                <div key={lot.id} className={clsx(
                  'border rounded-xl p-4 transition-all duration-300',
                  lot.status === 'active' ? 'bg-[#FF6B00]/5 border-[#FF6B00]/40 shadow-[0_0_16px_rgba(255,107,0,0.08)]'
                    : lot.status === 'sold' ? 'bg-green-900/10 border-green-800/30'
                    : lot.status === 'no_sale' ? 'bg-[#1A1A1A] border-red-900/20 opacity-60'
                    : 'bg-[#141414] border-[#2A2A2A]'
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#666] text-xs font-mono">LOT {lot.lotOrder}</span>
                    <span className={clsx('text-xs font-bold uppercase tracking-wider flex items-center gap-1',
                      lot.status === 'active' ? 'text-[#FF6B00]'
                        : lot.status === 'sold' ? 'text-green-400'
                        : lot.status === 'no_sale' ? 'text-red-400'
                        : 'text-[#444]'
                    )}>
                      {lot.status === 'active' && <span className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full animate-pulse" />}
                      {lot.status.replace('_', ' ')}
                    </span>
                  </div>
                  {lot.vehicle && (
                    <p className="text-white text-sm font-semibold">
                      {lot.vehicle.year} {lot.vehicle.make} {lot.vehicle.model}
                    </p>
                  )}
                  {lot.vehicle?.damageType && (
                    <p className="text-[#666] text-xs mt-0.5">{lot.vehicle.damageType}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[#555] text-xs">{lot.bidCount} bid{lot.bidCount !== 1 ? 's' : ''}</span>
                    <span className={clsx('font-mono text-sm font-bold',
                      lot.status === 'sold' ? 'text-green-400'
                        : lot.status === 'active' ? 'text-[#FF6B00]'
                        : 'text-white'
                    )}>
                      {lot.status === 'sold' ? formatCurrency(lot.soldPrice!)
                        : lot.currentBid > 0 ? formatCurrency(lot.currentBid)
                        : formatCurrency(lot.startingBid)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {(soldLots.length > 0 || auction.status === 'completed') && (
              <div className="card">
                <h4 className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Total lots', value: lots.length, color: 'text-white' },
                    { label: 'Sold', value: soldLots.length, color: 'text-green-400' },
                    { label: 'No sale', value: lots.filter((l: Lot) => l.status === 'no_sale').length, color: 'text-red-400' },
                    { label: 'Pending', value: pendingLots.length, color: 'text-blue-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[#666]">{label}</span>
                      <span className={clsx('font-semibold', color)}>{value}</span>
                    </div>
                  ))}
                  {(auction.totalSales || 0) > 0 && (
                    <div className="flex justify-between pt-2 border-t border-[#2A2A2A]">
                      <span className="text-[#888] font-medium">Total Sales</span>
                      <span className="text-[#FF6B00] font-mono font-bold">{formatCurrency(auction.totalSales || 0)}</span>
                    </div>
                  )}
                </div>
                {lots.length > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((soldLots.length / lots.length) * 100)}%` }} />
                    </div>
                    <p className="text-[#555] text-xs mt-1 text-right">
                      {Math.round((soldLots.length / lots.length) * 100)}% sold
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
