import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { TradingAccount } from '@shared/schema';

interface PerformanceChartProps {
  currentAccount: TradingAccount | null;
}

export default function PerformanceChart({ currentAccount }: PerformanceChartProps) {
  const [timeframe, setTimeframe] = useState('1D');

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/analytics/performance', currentAccount?.id, timeframe],
    enabled: Boolean(currentAccount),
  });

  const timeframes = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
  ];

  return (
    <div className="glass-morphism rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Performance Overview</h2>
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeframe === tf.value
                  ? 'bg-apple-blue/20 text-apple-blue'
                  : 'hover:bg-white/10'
              }`}
              data-testid={`button-chart-${tf.value.toLowerCase()}`}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="h-64 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl flex items-center justify-center">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading performance data...</p>
          </div>
        ) : currentAccount ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    ${(performanceData as any)?.totalPnl?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-400">Total P&L</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-6 h-6 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {(performanceData as any)?.winRate?.toFixed(1) || '0'}%
                  </div>
                  <div className="text-xs text-gray-400">Win Rate</div>
                </div>
              </div>
            </div>
            <p className="text-gray-400">Performance chart for {timeframe} timeframe</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl text-gray-600 mb-4">📊</div>
            <p className="text-gray-400">Select an account to view performance</p>
          </div>
        )}
      </div>
    </div>
  );
}