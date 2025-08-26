import { useState } from 'react';
import { Plus, RefreshCw, Calendar, Brain, Upload, Mail } from "lucide-react";
import { ImportCsvModal } from "@/components/import-csv-modal";
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { TradingAccount } from '@shared/schema';

const actions = [
  {
    name: "Add Trade",
    icon: Plus,
    color: "text-apple-blue",
    testId: "button-add-trade",
  },
];

interface QuickActionsProps {
  currentAccount: TradingAccount | null;
  onSyncTrades?: () => void;
}

export default function QuickActions({ currentAccount, onSyncTrades }: QuickActionsProps) {
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const addTradeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/trades', {
        ...data,
        tradingAccountId: currentAccount?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades/recent'] });
      toast({
        title: "Trade Added",
        description: "Your trade has been added successfully.",
      });
      setIsAddTradeOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddTrade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addTradeMutation.mutate({
      symbol: formData.get('symbol'),
      side: formData.get('side'),
      qty: formData.get('quantity'),
      entryPrice: formData.get('entryPrice'),
      exitPrice: formData.get('exitPrice'),
      entryTime: new Date(formData.get('entryTime') as string),
      exitTime: formData.get('exitTime') ? new Date(formData.get('exitTime') as string) : null,
      pnl: formData.get('pnl'),
      fees: formData.get('fees') || '0',
    });
  };
  const actionHandlers = {
    "Add Trade": () => setIsAddTradeOpen(true),
  };

  return (
    <>
      <div className="flex space-x-4" data-testid="quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.name}
              onClick={actionHandlers[action.name as keyof typeof actionHandlers]}
              className="glass-morphism rounded-xl px-6 py-3 hover:bg-white/10 transition-all flex items-center space-x-2"
              data-testid={action.testId}
            >
              <Icon className={`w-5 h-5 ${action.color}`} />
              <span>{action.name}</span>
            </button>
          );
        })}
      </div>

      {/* Add Trade Modal */}
      <Dialog open={isAddTradeOpen} onOpenChange={setIsAddTradeOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Trade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTrade} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Symbol</Label>
                <Input
                  name="symbol"
                  placeholder="ES, NQ, YM, etc."
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                  data-testid="input-trade-symbol"
                />
              </div>
              <div>
                <Label className="text-gray-300">Side</Label>
                <Select name="side" required>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select side" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Quantity</Label>
                <Input
                  name="quantity"
                  type="number"
                  step="1"
                  placeholder="1"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                  data-testid="input-trade-quantity"
                />
              </div>
              <div>
                <Label className="text-gray-300">Entry Price</Label>
                <Input
                  name="entryPrice"
                  type="number"
                  step="0.25"
                  placeholder="4500.00"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                  data-testid="input-trade-entry-price"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Exit Price (Optional)</Label>
                <Input
                  name="exitPrice"
                  type="number"
                  step="0.25"
                  placeholder="4510.00"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="input-trade-exit-price"
                />
              </div>
              <div>
                <Label className="text-gray-300">P&L</Label>
                <Input
                  name="pnl"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                  data-testid="input-trade-pnl"
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-300">Entry Time</Label>
              <Input
                name="entryTime"
                type="datetime-local"
                className="bg-gray-800 border-gray-700 text-white"
                required
                data-testid="input-trade-entry-time"
              />
            </div>
            <Button type="submit" disabled={addTradeMutation.isPending} className="w-full" data-testid="button-submit-trade">
              {addTradeMutation.isPending ? 'Adding Trade...' : 'Add Trade'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Coach Modal */}
      <Dialog open={isAiCoachOpen} onOpenChange={setIsAiCoachOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-400" />
              AI Trading Coach
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">AI Coaching Features</h3>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>• Personalized trading insights based on your performance</li>
                <li>• Risk management recommendations</li>
                <li>• Pattern recognition in your trading behavior</li>
                <li>• Real-time performance analysis</li>
              </ul>
            </div>
            <Button 
              onClick={() => {
                const generateButton = document.querySelector('[data-testid="button-generate-insights"]');
                (generateButton as HTMLButtonElement)?.click();
                setIsAiCoachOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-start-ai-analysis"
            >
              Generate AI Insights for {currentAccount?.nickname || 'Current Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
      />
    </>
  );
}
