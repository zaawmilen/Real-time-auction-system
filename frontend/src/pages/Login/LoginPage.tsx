import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { login, register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate('/auctions');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errs: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          errs[e.path] = e.msg;
        });
        setFieldErrors(errs);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#003087] relative overflow-hidden flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">C</span>
            </div>
            <span className="font-display font-bold text-white text-2xl tracking-wide uppercase">
              Copart Simulator
            </span>
          </div>
          <h1 className="font-display font-bold text-white text-5xl leading-tight mb-6">
            Real-time<br />Vehicle<br />Auctions
          </h1>
          <p className="text-blue-200 text-lg max-w-sm">
            Bid on thousands of salvage and clean title vehicles. AI-powered suggestions. Live auction rooms.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Vehicles', value: '12,400+' },
            { label: 'Live Auctions', value: '48' },
            { label: 'Avg Savings', value: '64%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4">
              <div className="font-display font-bold text-white text-2xl">{stat.value}</div>
              <div className="text-blue-200 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Background decoration */}
        <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-blue-800/30 blur-3xl" />
        <div className="absolute -left-16 top-1/3 w-64 h-64 rounded-full bg-[#FF6B00]/10 blur-3xl" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-[#FF6B00] rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold">C</span>
            </div>
            <span className="font-display font-bold text-white text-xl uppercase tracking-wide">
              Copart Simulator
            </span>
          </div>

          <h2 className="font-display font-bold text-white text-3xl mb-2">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-[#888] mb-8">
            {mode === 'login'
              ? 'Access your auction dashboard'
              : 'Start bidding in minutes'}
          </p>

    

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    name="firstName"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <input
                    name="lastName"
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <input
                name="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                className="input"
                required
              />
              {fieldErrors.email && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="input"
                required
              />
              {fieldErrors.password && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading
                ? 'Please wait...'
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[#888] mt-6 text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
              className="text-[#FF6B00] hover:text-[#FF8C00] font-medium"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
