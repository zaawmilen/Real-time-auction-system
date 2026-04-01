import { useState } from 'react';
import clsx from 'clsx';
import { aiApi } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import type { Lot } from '../../types';

interface AiPanelProps {
  lot: Lot;
  onUseSuggestion?: (amount: number) => void;
}

interface AiSuggestion {
  recommendedMaxBid: number;
  confidence: 'high' | 'medium' | 'low';
  profitPotential: 'excellent' | 'good' | 'marginal' | 'risky';
  estimatedProfit: number;
  reasoning: string;
  warnings: string[];
  shouldBid: boolean;
  bidStrategy: 'aggressive' | 'moderate' | 'conservative' | 'pass';
}

interface AiResponse {
  lotId: string;
  vehicle: string;
  acv: number;
  repair: number;
  currentBid: number;
  nextMin: number;
  suggestion: AiSuggestion;
}

export default function AiPanel({ lot, onUseSuggestion }: AiPanelProps) {
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const { data } = await aiApi.suggestBid({ lotId: lot.id });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'AI analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const confidenceColors = {
    high: 'text-green-400',
    medium: 'text-yellow-400',
    low: 'text-red-400',
  };

  const potentialColors = {
    excellent: 'text-green-400 bg-green-900/30 border-green-700',
    good: 'text-blue-400 bg-blue-900/30 border-blue-800',
    marginal: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
    risky: 'text-red-400 bg-red-900/30 border-red-700',
  };

  const strategyColors = {
    aggressive: 'text-red-400',
    moderate: 'text-yellow-400',
    conservative: 'text-blue-400',
    pass: 'text-[#888]',
  };

  return (
    <div className={clsx(
      'border rounded-xl overflow-hidden transition-all duration-300',
      result?.suggestion.shouldBid === false
        ? 'border-red-900/40 bg-red-950/10'
        : result?.suggestion.profitPotential === 'excellent'
          ? 'border-green-800/40 bg-green-950/10'
          : 'border-[#2A2A2A] bg-[#141414]'
    )}>
      {/* Header */}
      <button
        onClick={() => expanded ? setExpanded(false) : (result ? setExpanded(true) : analyze())}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center text-base',
            loading ? 'bg-[#FF6B00]/20 animate-pulse' : 'bg-[#FF6B00]/20'
          )}>
            🤖
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">AI Bid Analysis</p>
            <p className="text-[#666] text-xs">
              {loading ? 'Analyzing vehicle...' :
               result ? `Recommends ${formatCurrency(result.suggestion.recommendedMaxBid)} max` :
               'Click to get AI recommendation'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span className={clsx(
              'text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider',
              potentialColors[result.suggestion.profitPotential]
            )}>
              {result.suggestion.profitPotential}
            </span>
          )}
          <svg className={clsx('w-4 h-4 text-[#666] transition-transform', expanded ? 'rotate-180' : '')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#2A2A2A] px-5 py-4">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={clsx('h-4 bg-[#2A2A2A] rounded animate-pulse', i === 1 ? 'w-3/4' : i === 2 ? 'w-1/2' : 'w-full')} />
              ))}
              <p className="text-[#666] text-xs text-center mt-2">Claude is analyzing the vehicle data...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button onClick={analyze} className="text-[#FF6B00] text-sm hover:underline">Try again</button>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {/* Main recommendation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                  <p className="text-[#666] text-xs mb-1">Recommended Max</p>
                  <p className="text-[#FF6B00] font-display font-bold text-2xl">
                    {formatCurrency(result.suggestion.recommendedMaxBid)}
                  </p>
                  <p className={clsx('text-xs mt-1 font-semibold capitalize', confidenceColors[result.suggestion.confidence])}>
                    {result.suggestion.confidence} confidence
                  </p>
                </div>
                <div className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                  <p className="text-[#666] text-xs mb-1">Est. Profit</p>
                  <p className={clsx('font-display font-bold text-2xl',
                    result.suggestion.estimatedProfit > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {result.suggestion.estimatedProfit >= 0 ? '+' : ''}{formatCurrency(result.suggestion.estimatedProfit)}
                  </p>
                  <p className={clsx('text-xs mt-1 font-semibold capitalize', strategyColors[result.suggestion.bidStrategy])}>
                    {result.suggestion.bidStrategy}
                  </p>
                </div>
              </div>

              {/* Value breakdown */}
              <div className="bg-[#1A1A1A] rounded-xl p-3 space-y-1.5 text-sm">
                {[
                  { label: 'ACV', value: formatCurrency(result.acv), color: 'text-white' },
                  { label: 'Est. Repair', value: `- ${formatCurrency(result.repair)}`, color: 'text-yellow-400' },
                  { label: 'Net Value', value: formatCurrency(result.acv - result.repair), color: 'text-green-400' },
                  { label: 'Current Bid', value: formatCurrency(result.currentBid), color: 'text-[#FF6B00]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#666]">{label}</span>
                    <span className={clsx('font-mono font-semibold', color)}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Reasoning */}
              <div>
                <p className="text-[#666] text-xs font-semibold uppercase tracking-wider mb-2">Analysis</p>
                <p className="text-[#ccc] text-sm leading-relaxed">{result.suggestion.reasoning}</p>
              </div>

              {/* Warnings */}
              {result.suggestion.warnings?.length > 0 && (
                <div className="space-y-1.5">
                  {result.suggestion.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2">
                      <span className="text-yellow-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
                      <p className="text-yellow-300 text-xs">{w}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                {result.suggestion.shouldBid ? (
                  <button
                    onClick={() => onUseSuggestion?.(result.suggestion.recommendedMaxBid)}
                    className="flex-1 bg-[#FF6B00] hover:bg-[#FF8C00] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Use {formatCurrency(result.suggestion.recommendedMaxBid)}
                  </button>
                ) : (
                  <div className="flex-1 bg-red-900/30 border border-red-700/50 text-red-400 font-semibold py-2.5 rounded-lg text-sm text-center">
                    ✗ AI recommends passing
                  </div>
                )}
                <button
                  onClick={analyze}
                  className="px-4 py-2.5 border border-[#3A3A3A] text-[#888] hover:text-white hover:border-[#555] rounded-lg text-sm transition-colors"
                >
                  ↻
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
