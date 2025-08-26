import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Header() {
  const { user } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState("eval");

  const getInitials = (user: any) => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <header className="bg-gray-900/30 backdrop-blur-xl border-b border-white/10 px-8 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Trading Dashboard</h1>
          <div className="text-sm text-gray-400" data-testid="text-current-date">
            {formatDate()}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Account Switcher */}
          <div className="glass-morphism rounded-xl px-4 py-2">
            <select 
              className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              data-testid="select-account"
            >
              <option value="eval" className="bg-gray-800">Eval Account - Apex</option>
              <option value="pa" className="bg-gray-800">PA Account - TopStep</option>
              <option value="live" className="bg-gray-800">Live Account - Take Profit</option>
            </select>
          </div>
          
          {/* Tradovate Status */}
          <div className="flex items-center space-x-2 glass-morphism rounded-xl px-4 py-2" data-testid="status-tradovate">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">Tradovate Connected</span>
          </div>
          
          {/* User Avatar */}
          <button 
            className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            data-testid="button-user-avatar"
            onClick={() => window.location.href = "/api/logout"}
          >
            <span className="text-sm font-semibold" data-testid="text-user-initials">
              {getInitials(user)}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
