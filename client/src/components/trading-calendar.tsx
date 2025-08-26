import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import JournalModal from "./journal-modal";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface CalendarDay {
  date: string;
  trades: number;
  pnl: number;
  hasJournal: boolean;
  isOpenMarket: boolean;
  events: Array<{ id: string; title: string; importance: string }>;
}

export default function TradingCalendar() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth] = useState(() => format(new Date(), "yyyy-MM"));

  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ["/api/analytics/daily", { month: currentMonth }],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Handle unauthorized error
  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const { data: economicEvents } = useQuery({
    queryKey: ["/api/econ", { month: currentMonth }],
  });

  const openJournalModal = (date: string) => {
    setSelectedDate(date);
  };

  const closeJournalModal = () => {
    setSelectedDate(null);
  };

  // Generate calendar days for the current month
  const monthStart = startOfMonth(new Date(currentMonth + "-01"));
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Create lookup for calendar data
  const dayDataLookup = new Map<string, CalendarDay>();
  (calendarData as any)?.days?.forEach((day: CalendarDay) => {
    dayDataLookup.set(day.date, day);
  });

  // Create lookup for economic events
  const eventsLookup = new Map<string, any[]>();
  (economicEvents as any)?.forEach?.((event: any) => {
    const dateKey = event.date;
    if (!eventsLookup.has(dateKey)) {
      eventsLookup.set(dateKey, []);
    }
    eventsLookup.get(dateKey)!.push(event);
  });

  const getDayOfWeek = (date: Date) => {
    return getDay(date);
  };

  const isMarketOpen = (date: Date) => {
    const dayOfWeek = getDayOfWeek(date);
    // Simple logic: weekdays are market open (1-5), weekends are closed (0,6)
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${sign}$${pnl.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="glass-morphism rounded-2xl p-6">
        <div className="h-6 bg-gray-700 rounded mb-6 w-48"></div>
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700/50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-morphism rounded-2xl p-6" data-testid="trading-calendar">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" data-testid="text-calendar-title">Trading Calendar</h2>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-market-open rounded-full"></div>
              <span className="text-gray-400">Market Open</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-market-closed rounded-full"></div>
              <span className="text-gray-400">Market Closed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-event-pill rounded-full"></div>
              <span className="text-gray-400">Economic Events</span>
            </div>
          </div>
        </div>
        
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-gray-400 text-sm font-medium py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date) => {
            const dateString = format(date, "yyyy-MM-dd");
            const dayData = dayDataLookup.get(dateString);
            const events = eventsLookup.get(dateString) || [];
            const isOpen = isMarketOpen(date);
            
            const bgColor = isOpen 
              ? "bg-market-open/20 border-market-open/30"
              : "bg-market-closed/20 border-market-closed/30";

            return (
              <div
                key={dateString}
                className={`market-day ${bgColor} border rounded-xl p-3 h-24 cursor-pointer relative hover:transform hover:-translate-y-0.5 hover:shadow-lg transition-all`}
                onClick={() => openJournalModal(dateString)}
                data-testid={`calendar-day-${format(date, "d")}`}
              >
                <div className="font-semibold text-sm" data-testid={`day-number-${format(date, "d")}`}>
                  {format(date, "d")}
                </div>
                
                {/* Economic Events */}
                {events.length > 0 && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-event-pill rounded-full px-2 py-0.5 text-xs text-white font-medium">
                      {events[0].title.substring(0, 3)}
                    </div>
                  </div>
                )}
                
                {/* Trade Data */}
                {dayData && (dayData.trades > 0 || dayData.hasJournal) && (
                  <div className="absolute bottom-2 left-2 right-2 space-y-1">
                    {dayData.trades > 0 && (
                      <>
                        <div className={`text-xs font-medium ${dayData.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`} data-testid={`day-pnl-${format(date, "d")}`}>
                          {formatPnL(dayData.pnl)}
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${dayData.pnl >= 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className="text-xs text-gray-400" data-testid={`day-trades-${format(date, "d")}`}>
                            {dayData.trades} trade{dayData.trades !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </>
                    )}
                    {dayData.hasJournal && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-xs text-gray-400">Journal</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <JournalModal
          date={selectedDate}
          onClose={closeJournalModal}
        />
      )}
    </>
  );
}
