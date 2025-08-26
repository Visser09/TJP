import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, Wallet, Trophy } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

export default function MetricsGrid() {
  const { toast } = useToast();

  const { data: performance, isLoading, error } = useQuery({
    queryKey: ["/api/analytics/performance"],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Handle unauthorized error
  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const metrics = [
    {
      title: "Daily P&L",
      value: (performance as any)?.totalPnl ? `$${(performance as any).totalPnl.toLocaleString()}` : "$0",
      change: "+14.2% today",
      icon: TrendingUp,
      color: "text-green-400",
      testId: "metric-daily-pnl",
    },
    {
      title: "Win Rate",
      value: (performance as any)?.winRate ? `${(performance as any).winRate.toFixed(1)}%` : "0%",
      change: "↑ 2.1% this week",
      icon: Target,
      color: "text-blue-400",
      testId: "metric-win-rate",
    },
    {
      title: "Account Balance",
      value: "$52,340",
      change: "Max DD: -$1,240",
      icon: Wallet,
      color: "text-purple-400",
      testId: "metric-balance",
    },
    {
      title: "Profit Factor",
      value: "2.14",
      change: "Above target",
      icon: Trophy,
      color: "text-yellow-400",
      testId: "metric-profit-factor",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-morphism rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-4"></div>
            <div className="h-8 bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="metrics-grid">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.title} className="glass-morphism rounded-2xl p-6" data-testid={metric.testId}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-sm font-medium">{metric.title}</h3>
              <Icon className={`w-5 h-5 ${metric.color}`} />
            </div>
            <div className={`text-3xl font-bold ${metric.color}`} data-testid={`${metric.testId}-value`}>
              {metric.value}
            </div>
            <div className="text-sm text-gray-400 mt-2" data-testid={`${metric.testId}-change`}>
              {metric.change}
            </div>
          </div>
        );
      })}
    </div>
  );
}
