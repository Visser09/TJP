import { Plus, RefreshCw, Calendar, Brain } from "lucide-react";

const actions = [
  {
    name: "Add Trade",
    icon: Plus,
    color: "text-apple-blue",
    testId: "button-add-trade",
  },
  {
    name: "Sync Tradovate",
    icon: RefreshCw,
    color: "text-green-400",
    testId: "button-sync-tradovate",
  },
  {
    name: "Calendar View",
    icon: Calendar,
    color: "text-purple-400",
    testId: "button-calendar-view",
  },
  {
    name: "AI Coach",
    icon: Brain,
    color: "text-blue-400",
    testId: "button-ai-coach",
  },
];

export default function QuickActions() {
  return (
    <div className="flex space-x-4" data-testid="quick-actions">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.name}
            className="glass-morphism rounded-xl px-6 py-3 hover:bg-white/10 transition-all flex items-center space-x-2"
            data-testid={action.testId}
          >
            <Icon className={`w-5 h-5 ${action.color}`} />
            <span>{action.name}</span>
          </button>
        );
      })}
    </div>
  );
}
