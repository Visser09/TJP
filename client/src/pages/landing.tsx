import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Calendar, Brain } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-apple-blue rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              TradingJournal
              <span className="text-apple-blue"> Pro</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Zero-manual journaling. Clean, Apple-simple UI. AI that actually helps.
              Built specifically for futures traders using prop firms.
            </p>
            <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
              <Button 
                size="lg" 
                className="bg-apple-blue hover:bg-blue-600 text-white px-8 py-4 text-lg"
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-login"
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 px-8 py-4 text-lg"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for Professional Futures Traders
          </h2>
          <p className="text-xl text-gray-300">
            Seamless integration with Tradovate and leading prop firms
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="glass-morphism border-white/10 bg-white/5">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auto-Sync Trades</h3>
              <p className="text-gray-400 text-sm">
                Connect your Tradovate account for automatic trade importing and real-time sync
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-white/10 bg-white/5">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Calendar</h3>
              <p className="text-gray-400 text-sm">
                Visual trading calendar with market sessions, economic events, and P&L tracking
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-white/10 bg-white/5">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Coach</h3>
              <p className="text-gray-400 text-sm">
                Get personalized insights, risk alerts, and performance optimization suggestions
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism border-white/10 bg-white/5">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Multi-Account</h3>
              <p className="text-gray-400 text-sm">
                Track Eval, PA, and Live accounts separately with prop firm specific analytics
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prop Firms Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Traders at Leading Prop Firms
          </h2>
          <p className="text-xl text-gray-300">
            Apex, TopStep, Take Profit Trader, and more
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <span className="text-sm font-bold">APEX</span>
            </div>
            <p className="text-sm text-gray-400">Apex Trader</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <span className="text-sm font-bold">TS</span>
            </div>
            <p className="text-sm text-gray-400">TopStep</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <span className="text-sm font-bold">TPT</span>
            </div>
            <p className="text-sm text-gray-400">Take Profit</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-2 flex items-center justify-center">
              <span className="text-sm font-bold">TV</span>
            </div>
            <p className="text-sm text-gray-400">Tradovate</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Card className="glass-morphism border-white/10 bg-white/5">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Level Up Your Trading?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of professional futures traders who use TradingJournal Pro 
              to analyze their performance and improve their results.
            </p>
            <Button 
              size="lg" 
              className="bg-apple-blue hover:bg-blue-600 text-white px-8 py-4 text-lg"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-signup"
            >
              Start Your Free Trial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
