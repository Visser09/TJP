import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wifi, WifiOff, RotateCw, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { TradingAccount } from '@shared/schema';

interface TradovateConnectProps {
  account: TradingAccount;
}

export default function TradovateConnect({ account }: TradovateConnectProps) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    cid: '',
    sec: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isConnected = Boolean(account.tradovateAccessToken);
  const lastSyncDate = account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleDateString() : null;

  const authMutation = useMutation({
    mutationFn: async (data: typeof credentials) => {
      return apiRequest('/api/tradovate/auth', 'POST', {
        accountId: account.id,
        credentials: {
          username: data.username,
          password: data.password,
          cid: parseInt(data.cid),
          sec: data.sec,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading-accounts'] });
      toast({
        title: "Connected to Tradovate",
        description: "Your account is now connected and ready for syncing.",
      });
      setIsAuthOpen(false);
      setCredentials({ username: '', password: '', cid: '', sec: '' });
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Tradovate. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/tradovate/sync', 'POST', {
        accountId: account.id,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/recent', account.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/performance', account.id] });
      toast({
        title: "Sync Complete",
        description: `Synced ${data.syncedTrades || 0} new trades from Tradovate.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync trades from Tradovate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    authMutation.mutate(credentials);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-400" />
            <Badge variant="outline" className="border-green-400 text-green-400">
              Connected
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-gray-400" />
            <Badge variant="outline" className="border-gray-400 text-gray-400">
              Not Connected
            </Badge>
          </div>
        )}
      </div>

      {/* Connect/Sync Buttons */}
      {isConnected ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-sync-trades"
          >
            <RotateCw className={`w-4 h-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Trades'}
          </Button>
          {lastSyncDate && (
            <span className="text-xs text-gray-400">
              Last: {lastSyncDate}
            </span>
          )}
        </div>
      ) : (
        <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" data-testid="button-connect-tradovate">
              Connect to Tradovate
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Connect to Tradovate
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="text-sm text-gray-400 bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
                <strong>Warning:</strong> Only enter your Tradovate credentials if you trust this application. 
                We recommend using a demo account for testing.
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                    data-testid="input-tradovate-username"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                    data-testid="input-tradovate-password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cid" className="text-gray-300">CID (Customer ID)</Label>
                  <Input
                    id="cid"
                    type="number"
                    value={credentials.cid}
                    onChange={(e) => setCredentials(prev => ({ ...prev, cid: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                    data-testid="input-tradovate-cid"
                  />
                </div>
                <div>
                  <Label htmlFor="sec" className="text-gray-300">SEC (Security)</Label>
                  <Input
                    id="sec"
                    type="text"
                    value={credentials.sec}
                    onChange={(e) => setCredentials(prev => ({ ...prev, sec: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                    data-testid="input-tradovate-sec"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={authMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-authenticate-tradovate"
              >
                {authMutation.isPending ? 'Connecting...' : 'Connect Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}