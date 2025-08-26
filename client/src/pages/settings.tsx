import React, { useState } from "react";
import { Settings as SettingsIcon, User, Bell, Shield, Database, Save } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserSettings {
  notifications: {
    emailAlerts: boolean;
    tradeAlerts: boolean;
    aiInsights: boolean;
    weeklyReports: boolean;
  };
  trading: {
    defaultRiskPercent: number;
    autoSync: boolean;
    syncInterval: number;
  };
  preferences: {
    timezone: string;
    currency: string;
    theme: string;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['/api/user/settings'],
    queryFn: async () => {
      // Default settings if none exist
      return {
        notifications: {
          emailAlerts: true,
          tradeAlerts: true,
          aiInsights: true,
          weeklyReports: false
        },
        trading: {
          defaultRiskPercent: 1.0,
          autoSync: true,
          syncInterval: 300 // 5 minutes
        },
        preferences: {
          timezone: 'America/New_York',
          currency: 'USD',
          theme: 'dark'
        }
      };
    }
  });

  const [formData, setFormData] = useState<UserSettings | null>(null);

  // Initialize form data when settings load
  React.useEffect(() => {
    if (settings && !formData) {
      setFormData(settings);
    }
  }, [settings, formData]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UserSettings) => {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (formData) {
      await updateSettingsMutation.mutateAsync(formData);
    }
  };

  const updateFormData = (section: keyof UserSettings, key: string, value: any) => {
    if (formData) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [key]: value
        }
      });
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <Sidebar />
        <div className="ml-20">
          <Header />
          <main className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-apple-blue mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading settings...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2" data-testid="text-settings-title">
                    Settings
                  </h1>
                  <p className="text-gray-400" data-testid="text-settings-subtitle">
                    Customize your trading journal experience
                  </p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isPending}
                  className="bg-apple-blue hover:bg-apple-blue/80"
                  data-testid="button-save-settings"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Notifications */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <div className="flex items-center mb-4">
                  <Bell className="w-5 h-5 mr-2 text-apple-blue" />
                  <h2 className="text-xl font-semibold" data-testid="text-notifications-title">
                    Notifications
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Email Alerts</label>
                      <p className="text-sm text-gray-400">Receive important updates via email</p>
                    </div>
                    <Switch
                      checked={formData.notifications.emailAlerts}
                      onCheckedChange={(checked) => updateFormData('notifications', 'emailAlerts', checked)}
                      data-testid="switch-email-alerts"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Trade Alerts</label>
                      <p className="text-sm text-gray-400">Get notified when trades are synced</p>
                    </div>
                    <Switch
                      checked={formData.notifications.tradeAlerts}
                      onCheckedChange={(checked) => updateFormData('notifications', 'tradeAlerts', checked)}
                      data-testid="switch-trade-alerts"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">AI Insights</label>
                      <p className="text-sm text-gray-400">Receive AI-generated trading insights</p>
                    </div>
                    <Switch
                      checked={formData.notifications.aiInsights}
                      onCheckedChange={(checked) => updateFormData('notifications', 'aiInsights', checked)}
                      data-testid="switch-ai-insights"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Weekly Reports</label>
                      <p className="text-sm text-gray-400">Get weekly performance summaries</p>
                    </div>
                    <Switch
                      checked={formData.notifications.weeklyReports}
                      onCheckedChange={(checked) => updateFormData('notifications', 'weeklyReports', checked)}
                      data-testid="switch-weekly-reports"
                    />
                  </div>
                </div>
              </div>

              {/* Trading Settings */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <div className="flex items-center mb-4">
                  <Database className="w-5 h-5 mr-2 text-apple-blue" />
                  <h2 className="text-xl font-semibold" data-testid="text-trading-settings-title">
                    Trading Settings
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-1">Default Risk Percentage</label>
                    <p className="text-sm text-gray-400 mb-2">Default risk per trade as percentage of account</p>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={formData.trading.defaultRiskPercent}
                      onChange={(e) => updateFormData('trading', 'defaultRiskPercent', parseFloat(e.target.value))}
                      className="bg-gray-800 border-gray-700 text-white w-32"
                      data-testid="input-default-risk"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium">Auto Sync</label>
                      <p className="text-sm text-gray-400">Automatically sync trades from Tradovate</p>
                    </div>
                    <Switch
                      checked={formData.trading.autoSync}
                      onCheckedChange={(checked) => updateFormData('trading', 'autoSync', checked)}
                      data-testid="switch-auto-sync"
                    />
                  </div>
                  {formData.trading.autoSync && (
                    <div>
                      <label className="block font-medium mb-1">Sync Interval (seconds)</label>
                      <p className="text-sm text-gray-400 mb-2">How often to check for new trades</p>
                      <select
                        value={formData.trading.syncInterval}
                        onChange={(e) => updateFormData('trading', 'syncInterval', parseInt(e.target.value))}
                        className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                        data-testid="select-sync-interval"
                      >
                        <option value={60}>1 minute</option>
                        <option value={300}>5 minutes</option>
                        <option value={900}>15 minutes</option>
                        <option value={1800}>30 minutes</option>
                        <option value={3600}>1 hour</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <div className="flex items-center mb-4">
                  <User className="w-5 h-5 mr-2 text-apple-blue" />
                  <h2 className="text-xl font-semibold" data-testid="text-preferences-title">
                    Preferences
                  </h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium mb-1">Timezone</label>
                    <select
                      value={formData.preferences.timezone}
                      onChange={(e) => updateFormData('preferences', 'timezone', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 w-full max-w-xs"
                      data-testid="select-timezone"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London Time (GMT)</option>
                      <option value="Europe/Paris">Central European Time</option>
                      <option value="Asia/Tokyo">Tokyo Time (JST)</option>
                      <option value="Asia/Singapore">Singapore Time (SGT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium mb-1">Display Currency</label>
                    <select
                      value={formData.preferences.currency}
                      onChange={(e) => updateFormData('preferences', 'currency', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
                      data-testid="select-currency"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="AUD">AUD (A$)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Account Management */}
              <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <div className="flex items-center mb-4">
                  <Shield className="w-5 h-5 mr-2 text-apple-blue" />
                  <h2 className="text-xl font-semibold" data-testid="text-account-title">
                    Account Management
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                    <div>
                      <h3 className="font-medium">Data Export</h3>
                      <p className="text-sm text-gray-400">Download all your trading data</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-gray-700 text-white hover:bg-gray-800"
                      data-testid="button-export-data"
                    >
                      Export Data
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
                    <div>
                      <h3 className="font-medium text-red-400">Clear All Data</h3>
                      <p className="text-sm text-gray-400">This will permanently delete all your trades and journal entries</p>
                    </div>
                    <Button
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                      data-testid="button-clear-data"
                    >
                      Clear Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}