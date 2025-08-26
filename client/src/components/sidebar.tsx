import { Home, Calendar, BarChart3, Brain, Book, Settings, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const navigation = [
  { name: "Dashboard", icon: Home, path: "/", testId: "nav-dashboard" },
  { name: "Calendar", icon: Calendar, path: "/calendar", testId: "nav-calendar" },
  { name: "Analytics", icon: BarChart3, path: "/analytics", testId: "nav-analytics" },
  { name: "AI Coach", icon: Brain, path: "/ai-coach", testId: "nav-ai" },
  { name: "Journal", icon: Book, path: "/journal", testId: "nav-journal" },
  { name: "Settings", icon: Settings, path: "/settings", testId: "nav-settings" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  
  return (
    <div className="w-16 sm:w-20 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col items-center py-4 sm:py-6 fixed left-0 top-0 h-screen z-40">
      {/* Logo */}
      <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center mb-8" data-testid="logo">
        <BarChart3 className="w-5 h-5 text-white" />
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col space-y-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.name}
              onClick={() => setLocation(item.path)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                isActive
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
