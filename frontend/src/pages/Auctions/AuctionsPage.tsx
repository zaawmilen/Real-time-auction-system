import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuctions, useCreateAuction } from '../../hooks/useAuction';
import { useVehicles, useVehicleStats } from '../../hooks/useVehicles';
import AuctionCard from '../../components/AuctionCard/AuctionCard';
import VehicleCard from '../../components/VehicleCard/VehicleCard';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
// import clsx from 'clsx';

type Tab = 'auctions' | 'vehicles';

export default function AuctionsPage() {
  const [tab, setTab] = useState<Tab>('auctions');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', auctionDate: '', location: '', description: '' });
  const [createError, setCreateError] = useState('');

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'auctioneer';

  const { data: auctions, isLoading: auctionsLoading } = useAuctions();
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles({ search: search || undefined, limit: 12 });
  const { data: stats } = useVehicleStats();
  const { mutate: createAuction, isPending: isCreating } = useCreateAuction();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.title || !createForm.auctionDate) { setCreateError('Title and date are required'); return; }
    createAuction(createForm, {
      onSuccess: () => { setShowCreate(false); setCreateForm({ title: '', auctionDate: '', location: '', description: '' }); },
      onError: (err: any) => setCreateError(err.response?.data?.error || 'Failed to create'),
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="border-b border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-bold text-sm">C</span>
              </div>
              <span className="font-display font-bold text-white text-lg uppercase tracking-wide">Copart Simulator</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {(['auctions', 'vehicles'] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'bg-[#FF6B00]/10 text-[#FF6B00]' : 'text-[#888] hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-[#666] text-xs">{user?.buyerNumber} · {user?.role}</p>
            </div>
            <Link to="/my-bids" className="btn-secondary text-sm py-2 px-4">My Bids</Link>
            <button onClick={() => { logout(); navigate('/login'); }} className="btn-secondary text-sm py-2 px-4">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Vehicles', value: parseInt(stats.total).toLocaleString() },
              { label: 'Run & Drive', value: parseInt(stats.run_drive).toLocaleString() },
              { label: 'Avg ACV', value: formatCurrency(parseFloat(stats.avg_acv || '0')) },
              { label: 'Makes', value: parseInt(stats.unique_makes).toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl px-5 py-4">
                <p className="text-[#666] text-xs mb-1">{s.label}</p>
                <p className="font-display font-bold text-white text-2xl">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-bold text-white text-3xl capitalize">{tab}</h1>
          <div className="flex items-center gap-3">
            {tab === 'vehicles' && (
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Search make, model, VIN..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="input pl-10 w-72" />
              </div>
            )}
            {tab === 'auctions' && isAdmin && (
              <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm py-2 px-5">
                + New Auction
              </button>
            )}
          </div>
        </div>

        {/* Create auction form */}
        {showCreate && isAdmin && (
          <div className="card mb-6">
            <h3 className="font-display font-bold text-white text-lg mb-4">Create Auction</h3>
            {createError && <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-2.5 mb-4 text-sm">{createError}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Auction title *" value={createForm.title}
                onChange={e => setCreateForm({...createForm, title: e.target.value})} className="input" required />
              <input type="datetime-local" value={createForm.auctionDate}
                onChange={e => setCreateForm({...createForm, auctionDate: e.target.value})} className="input" required />
              <input placeholder="Location (e.g. Dallas, TX)" value={createForm.location}
                onChange={e => setCreateForm({...createForm, location: e.target.value})} className="input" />
              <input placeholder="Description (optional)" value={createForm.description}
                onChange={e => setCreateForm({...createForm, description: e.target.value})} className="input" />
              <div className="flex gap-3 md:col-span-2">
                <button type="submit" disabled={isCreating} className="btn-primary">{isCreating ? 'Creating...' : 'Create Auction'}</button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Auctions tab */}
        {tab === 'auctions' && (
          auctionsLoading ? <LoadingGrid count={3} /> :
          auctions?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctions.map((a: any) => <AuctionCard key={a.id} auction={a} />)}
            </div>
          ) : (
            <EmptyState title="No auctions yet"
              description={isAdmin ? 'Click "+ New Auction" to create your first auction.' : 'Check back soon.'} />
          )
        )}

        {/* Vehicles tab */}
        {tab === 'vehicles' && (
          vehiclesLoading ? <LoadingGrid count={12} /> :
          vehiclesData?.data?.length ? (
            <>
              <p className="text-[#888] text-sm mb-4">{vehiclesData.pagination.total.toLocaleString()} vehicles found</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {vehiclesData.data.map((v: any) => (
                  <VehicleCard key={v.id} vehicle={v} onClick={() => navigate(`/vehicles/${v.id}`)} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No vehicles found" description={search ? `No results for "${search}"` : 'No vehicles yet.'} />
          )
        )}
      </main>
    </div>
  );
}

function LoadingGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#141414] border border-[#2A2A2A] rounded-xl h-64 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[#444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-[#666] text-sm">{description}</p>
    </div>
  );
}
