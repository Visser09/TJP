import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface AiInsightsProps {
  currentAccount: any;
}

export default function AiInsights({ currentAccount }: AiInsightsProps) {
  const { toast } = useToast();

  const { data: insights, isLoading, error } = useQuery({
    queryKey: ["/api/ai-insights", currentAccount?.id],
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

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/ai-insights/generate", {
        accountId: currentAccount?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights", currentAccount?.id] });
      toast({
        title: "Success",
        description: "New AI insights generated successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate insights",
        variant: "destructive",
      });
    },
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "risk":
        return AlertTriangle;
      case "performance":
        return TrendingUp;
      case "suggestion":
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "risk":
        return "text-yellow-400";
      case "performance":
        return "text-green-400";
      case "suggestion":
      default:
        return "text-blue-400";
    }
  };

  const getInsightBorder = (type: string) => {
    switch (type) {
      case "risk":
        return "border-yellow-500/20 bg-yellow-500/10";
      case "performance":
        return "border-green-500/20 bg-green-500/10";
      case "suggestion":
      default:
        return "border-blue-500/20 bg-blue-500/10";
    }
  };

  return (
    <div className="glass-morphism rounded-2xl p-6" data-testid="ai-insights">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" data-testid="text-insights-title">AI Insights</h3>
        <button 
          className="text-apple-blue hover:text-blue-300 transition-colors disabled:opacity-50"
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
          data-testid="button-refresh-insights"
        >
          <RefreshCw className={`w-4 h-4 ${generateInsightsMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-700 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2 w-1/3"></div>
              <div className="h-3 bg-gray-700 rounded w-full"></div>
            </div>
          ))
        ) : insights && (insights as any).length > 0 ? (
          (insights as any).map((insight: any) => {
            const Icon = getInsightIcon(insight.type);
            const color = getInsightColor(insight.type);
            const borderStyle = getInsightBorder(insight.type);
            
            return (
              <div 
                key={insight.id} 
                className={`${borderStyle} border rounded-xl p-4`}
                data-testid={`insight-${insight.type}`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`${color} mt-1 w-4 h-4`} />
                  <div>
                    <h4 className={`font-medium ${color} mb-1`} data-testid={`insight-title-${insight.type}`}>
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-300" data-testid={`insight-content-${insight.type}`}>
                      {typeof insight.content === 'string' ? insight.content : JSON.stringify(insight.content)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p data-testid="text-no-insights">No insights available</p>
            <p className="text-sm">Generate some insights to get started</p>
          </div>
        )}
      </div>
      
      <button 
        className="w-full mt-4 bg-apple-blue hover:bg-blue-600 rounded-xl py-3 font-medium transition-colors"
        data-testid="button-ai-coach"
      >
        Chat with AI Coach
      </button>
    </div>
  );
}
