import { useState } from "react";
import { Brain, Zap, TrendingUp, AlertTriangle, Target, Lightbulb } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AIInsight {
  id: string;
  type: 'performance' | 'risk' | 'pattern' | 'recommendation';
  title: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: string;
  actionable: boolean;
}

export default function AICoach() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: insights = [], isLoading, error } = useQuery<AIInsight[]>({
    queryKey: ['/api/ai-insights'],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    }
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
      return await apiRequest('POST', '/api/ai-insights/generate', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-insights'] });
      toast({
        title: "AI Insights Generated",
        description: "New trading insights have been generated based on your recent activity.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI insights. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance': return TrendingUp;
      case 'risk': return AlertTriangle;
      case 'pattern': return Target;
      case 'recommendation': return Lightbulb;
      default: return Brain;
    }
  };

  const getInsightColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-400/30 bg-red-400/5';
      case 'medium': return 'border-yellow-400/30 bg-yellow-400/5';
      default: return 'border-green-400/30 bg-green-400/5';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      default: return 'text-green-400 bg-green-400/20';
    }
  };

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await generateInsightsMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2" data-testid="text-ai-coach-title">
                    AI Trading Coach
                  </h1>
                  <p className="text-gray-400" data-testid="text-ai-coach-subtitle">
                    Get personalized insights and recommendations powered by AI
                  </p>
                </div>
                <Button
                  onClick={handleGenerateInsights}
                  disabled={isGenerating || generateInsightsMutation.isPending}
                  className="bg-apple-blue hover:bg-apple-blue/80"
                  data-testid="button-generate-insights"
                >
                  {isGenerating || generateInsightsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate New Insights
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-900/50 rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : insights.length > 0 ? (
              <div className="space-y-6">
                {insights.map((insight) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div
                      key={insight.id}
                      className={`rounded-xl border p-6 ${getInsightColor(insight.severity || 'low')}`}
                      data-testid={`insight-${insight.id}`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-2 rounded-lg bg-white/10">
                          <Icon className="w-5 h-5 text-apple-blue" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-lg" data-testid={`text-insight-title-${insight.id}`}>
                              {insight.title}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(insight.severity || 'low')}`}>
                                {(insight.severity || 'low').toUpperCase()}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300 capitalize">
                                {insight.type}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-3" data-testid={`text-insight-content-${insight.id}`}>
                            {insight.content}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-400">
                            <span>
                              {new Date(insight.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {insight.actionable && (
                              <span className="px-2 py-1 rounded-full bg-apple-blue/20 text-apple-blue text-xs">
                                Actionable
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2" data-testid="text-no-insights-title">
                  No AI insights yet
                </h3>
                <p className="text-gray-400 mb-6" data-testid="text-no-insights-description">
                  Generate your first set of AI-powered trading insights based on your trading history and patterns.
                </p>
                <Button
                  onClick={handleGenerateInsights}
                  disabled={isGenerating || generateInsightsMutation.isPending}
                  className="bg-apple-blue hover:bg-apple-blue/80"
                  data-testid="button-generate-first-insights"
                >
                  {isGenerating || generateInsightsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate AI Insights
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* AI Coaching Tips */}
            <div className="mt-12 bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center" data-testid="text-coaching-tips-title">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
                AI Coaching Tips
              </h3>
              <div className="space-y-3 text-gray-300">
                <p>• AI insights are generated based on your trading history, journal entries, and market patterns</p>
                <p>• Higher severity insights indicate areas that need immediate attention</p>
                <p>• Actionable insights provide specific steps you can take to improve your trading</p>
                <p>• Generate new insights regularly to track your progress and adapt to market changes</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}