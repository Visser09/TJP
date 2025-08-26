import { Home, Calendar, BarChart3, Brain, Book, Settings, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", icon: Home, current: true, testId: "nav-dashboard" },
  { name: "Calendar", icon: Calendar, current: false, testId: "nav-calendar" },
  { name: "Analytics", icon: BarChart3, current: false, testId: "nav-analytics" },
  { name: "AI Coach", icon: Brain, current: false, testId: "nav-ai" },
  { name: "Journal", icon: Book, current: false, testId: "nav-journal" },
  { name: "Settings", icon: Settings, current: false, testId: "nav-settings" },
];

export default function Sidebar() {
  return (
    <div className="w-20 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-6 fixed h-full z-40">
      {/* Logo */}
      <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center mb-8" data-testid="logo">
        <BarChart3 className="w-5 h-5 text-white" />
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col space-y-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                item.current
                  ? "bg-apple-blue/20 text-apple-blue"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
              data-testid={item.testId}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </nav>
      
      {/* Theme Toggle */}
      <div className="mt-auto">
        <button 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          data-testid="button-theme-toggle"
        >
          <Moon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
