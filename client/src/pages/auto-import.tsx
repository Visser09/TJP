import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

export default function AutoImportPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Get ingest token and forwarding address
  const { data: ingestConfig, isLoading: ingestLoading } = useQuery({
    queryKey: ['/api/settings/ingest-token'],
    retry: false,
  });

  // Get TradingView webhook config
  const { data: webhookConfig, isLoading: webhookLoading } = useQuery({
    queryKey: ['/api/settings/tradingview-webhook'],
    retry: false,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Auto-Import Settings</h1>
            <p className="text-gray-400">Set up automatic data ingestion from your prop firm and TradingView</p>
          </div>
          <Button 
            onClick={() => navigate('/')}
            className="bg-apple-blue hover:bg-apple-blue/80"
            data-testid="button-back-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Email Auto-Import Section */}
        <div className="glass-morphism rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-apple-blue/20 rounded-lg flex items-center justify-center">
              <span className="text-apple-blue text-sm">📧</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Email Auto-Import</h2>
              <p className="text-gray-400 text-sm">
                Forward your prop firm daily statements and TradingView alert emails here
              </p>
            </div>
          </div>

          {ingestLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-apple-blue border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Your Unique Forwarding Address</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/5 rounded-lg p-3 font-mono text-sm break-all" data-testid="text-forwarding-address">
                    {ingestConfig?.forwardingAddress || 'user+abc123@ingest.yourdomain.com'}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(ingestConfig?.forwardingAddress || '', 'Forwarding address')}
                    className="bg-apple-blue/20 hover:bg-apple-blue/30 text-apple-blue"
                    data-testid="button-copy-address"
                  >
                    {copiedItem === 'Forwarding address' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-white">Setup Instructions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h5 className="font-medium text-apple-blue mb-3">Prop Firm Statements</h5>
                    <ol className="text-sm text-gray-300 space-y-2">
                      <li>1. Go to Gmail settings → Filters and Blocked Addresses</li>
                      <li>2. Create filter for emails from your prop firm</li>
                      <li>3. Set action to "Forward to" your address above</li>
                    </ol>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <h5 className="font-medium text-apple-blue mb-3">TradingView Alerts</h5>
                    <ol className="text-sm text-gray-300 space-y-2">
                      <li>1. Create TradingView alert with "Send Email" enabled</li>
                      <li>2. Include snapshot in alert settings</li>
                      <li>3. Forward alert emails to your address above</li>
                    </ol>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* TradingView Webhooks Section */}
        <div className="glass-morphism rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-purple-400 text-sm">🔗</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">TradingView Webhooks</h2>
              <p className="text-gray-400 text-sm">
                Real-time trade alerts with automatic screenshot capture (Optional)
              </p>
            </div>
          </div>

          {webhookLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Webhook URL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Webhook URL</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-lg p-3 font-mono text-sm break-all" data-testid="text-webhook-url">
                      {webhookConfig?.webhookUrl || 'https://your-domain.replit.app/api/ingest/tradingview'}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(webhookConfig?.webhookUrl || '', 'Webhook URL')}
                      className="bg-purple-400/20 hover:bg-purple-400/30 text-purple-400"
                      data-testid="button-copy-webhook"
                    >
                      {copiedItem === 'Webhook URL' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Webhook Secret */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Webhook Secret</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-lg p-3 font-mono text-sm" data-testid="text-webhook-secret">
                      {webhookConfig?.secret || 'your-secret-key'}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(webhookConfig?.secret || '', 'Webhook secret')}
                      className="bg-purple-400/20 hover:bg-purple-400/30 text-purple-400"
                      data-testid="button-copy-secret"
                    >
                      {copiedItem === 'Webhook secret' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Webhook Setup Instructions</h4>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li>1. Copy the webhook URL above</li>
                  <li>2. In TradingView, create a new alert</li>
                  <li>3. Set webhook URL as the notification method</li>
                  <li>4. Use provided JSON template in the message field</li>
                  <li>5. Enable "Send Webhook" in alert settings</li>
                </ol>
              </div>
            </>
          )}
        </div>

        {/* Benefits Section */}
        <div className="glass-morphism rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Benefits of Auto-Import</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-green-400 font-medium">✓ Automated</h4>
              <p className="text-sm text-gray-300">Zero manual data entry after initial setup</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-green-400 font-medium">✓ Real-time</h4>
              <p className="text-sm text-gray-300">TradingView alerts appear instantly</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-green-400 font-medium">✓ Screenshots</h4>
              <p className="text-sm text-gray-300">Charts automatically saved to journal</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-green-400 font-medium">✓ Backup</h4>
              <p className="text-sm text-gray-300">CSV import still available if needed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}