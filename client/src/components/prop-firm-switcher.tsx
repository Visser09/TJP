import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Settings, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import TradovateConnect from './tradovate-connect';
import type { TradingAccount } from '@shared/schema';

interface PropFirmSwitcherProps {
  currentAccount: TradingAccount | null;
  onAccountChange: (account: TradingAccount) => void;
}

const PROP_FIRMS = {
  apex: { name: 'Apex', color: 'bg-blue-500' },
  topstep: { name: 'TopStep', color: 'bg-green-500' },
  takeprofit: { name: 'Take Profit Trader', color: 'bg-purple-500' }
};

const ACCOUNT_TYPES = {
  eval: { name: 'Evaluation', icon: TrendingUp, color: 'text-orange-500' },
  pa: { name: 'Funded (PA)', icon: TrendingDown, color: 'text-green-500' },
  live: { name: 'Live Trading', icon: DollarSign, color: 'text-blue-500' }
};

export default function PropFirmSwitcher({ currentAccount, onAccountChange }: PropFirmSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery<TradingAccount[]>({
    queryKey: ['/api/trading-accounts'],
  });

  const createAccountMutation = useMutation({
    mutationFn: async (data: { propFirm: string; accountType: string; nickname: string }) => {
      return apiRequest('POST', '/api/trading-accounts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trading-accounts'] });
      toast({
        title: "Account Created",
        description: "New trading account has been created successfully.",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create trading account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createAccountMutation.mutate({
      propFirm: formData.get('propFirm') as string,
      accountType: formData.get('accountType') as string,
      nickname: formData.get('nickname') as string,
    });
  };

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.propFirm]) {
      acc[account.propFirm] = [];
    }
    acc[account.propFirm].push(account);
    return acc;
  }, {} as Record<string, TradingAccount[]>);

  return (
    <div className="flex items-center gap-3">
      {/* Current Account Display */}
      <div className="flex items-center gap-3 bg-gray-900/50 backdrop-blur-md border border-gray-800/50 rounded-xl p-3 min-w-[250px]">
        {currentAccount ? (
          <>
            <div className={`w-3 h-3 rounded-full ${PROP_FIRMS[currentAccount.propFirm as keyof typeof PROP_FIRMS]?.color || 'bg-gray-500'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">
                  {PROP_FIRMS[currentAccount.propFirm as keyof typeof PROP_FIRMS]?.name || 'Unknown'}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {ACCOUNT_TYPES[currentAccount.accountType as keyof typeof ACCOUNT_TYPES]?.name}
                </Badge>
              </div>
              <div className="text-xs text-gray-400 truncate">
                {currentAccount.nickname || `Account ${currentAccount.extAccountId}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                ${parseFloat(currentAccount.balance || '0').toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Balance</div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Building2 className="w-4 h-4" />
            <span>No Account Selected</span>
          </div>
        )}
      </div>

      {/* Account Selector */}
      <Select value={currentAccount?.id || ''} onValueChange={(value) => {
        const account = accounts.find(acc => acc.id === value);
        if (account) onAccountChange(account);
      }}>
        <SelectTrigger className="w-[200px] bg-gray-900/50 border-gray-800/50">
          <SelectValue placeholder="Switch Account" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-800">
          {Object.entries(groupedAccounts).map(([propFirm, firmAccounts]) => (
            <div key={propFirm}>
              <div className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {PROP_FIRMS[propFirm as keyof typeof PROP_FIRMS]?.name}
              </div>
              {firmAccounts.map((account) => {
                const AccountIcon = ACCOUNT_TYPES[account.accountType as keyof typeof ACCOUNT_TYPES]?.icon || Building2;
                return (
                  <SelectItem key={account.id} value={account.id} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 w-full">
                      <AccountIcon className={`w-4 h-4 ${ACCOUNT_TYPES[account.accountType as keyof typeof ACCOUNT_TYPES]?.color}`} />
                      <div className="flex-1">
                        <div className="font-medium">
                          {account.nickname || `Account ${account.extAccountId}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          ${parseFloat(account.balance || '0').toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </div>
          ))}
        </SelectContent>
      </Select>

      {/* Tradovate Connection */}
      {currentAccount && (
        <TradovateConnect account={currentAccount} />
      )}

      {/* Add Account Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="bg-gray-900/50 border-gray-800/50 hover:bg-gray-800/50"
            data-testid="button-add-account"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Trading Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prop Firm
              </label>
              <Select name="propFirm" required>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select prop firm" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PROP_FIRMS).map(([value, firm]) => (
                    <SelectItem key={value} value={value}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Account Type
              </label>
              <Select name="accountType" required>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPES).map(([value, type]) => (
                    <SelectItem key={value} value={value}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Account Nickname
              </label>
              <input
                name="nickname"
                type="text"
                required
                placeholder="e.g., My Apex Eval Account"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400"
                data-testid="input-account-nickname"
              />
            </div>

            <Button 
              type="submit" 
              disabled={createAccountMutation.isPending}
              className="w-full"
              data-testid="button-create-account"
            >
              {createAccountMutation.isPending ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}