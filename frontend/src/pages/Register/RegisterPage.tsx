import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import clsx from 'clsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setLocalError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setLocalError('First and last name are required');
      return;
    }
    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate('/auctions');
    } catch {
      // error handled by store
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6B00] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(255,107,0,0.3)]">
            <span className="text-white font-display font-bold text-2xl">C</span>
          </div>
          <h1 className="font-display font-bold text-white text-3xl">Create Account</h1>
          <p className="text-[#888] mt-2">Join Copart Auction Simulator</p>
        </div>

        <div className="card">
          {displayError && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#888] text-xs font-medium mb-1.5 uppercase tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className="input w-full"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[#888] text-xs font-medium mb-1.5 uppercase tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Smith"
                  className="input w-full"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="input w-full"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  className="input w-full pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {/* Password strength */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(level => (
                      <div key={level} className={clsx('h-1 flex-1 rounded-full transition-colors',
                        getPasswordStrength(form.password) >= level
                          ? level <= 1 ? 'bg-red-500' : level <= 2 ? 'bg-yellow-500' : level <= 3 ? 'bg-blue-500' : 'bg-green-500'
                          : 'bg-[#2A2A2A]'
                      )} />
                    ))}
                  </div>
                  <p className="text-xs text-[#666] mt-1">
                    {getPasswordStrengthLabel(form.password)}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-[#888] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                className={clsx('input w-full', form.confirmPassword && form.confirmPassword !== form.password && 'border-red-700')}
                required
              />
              {form.confirmPassword && form.confirmPassword !== form.password && (
                <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-base mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-[#666] text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF6B00] hover:text-[#FF8C00] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Info note */}
        <p className="text-center text-[#555] text-xs mt-4">
          New accounts are registered as bidders. Contact admin for auctioneer access.
        </p>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getPasswordStrengthLabel(password: string): string {
  const s = getPasswordStrength(password);
  return ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][s];
}
