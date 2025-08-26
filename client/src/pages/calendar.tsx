import { Calendar as CalendarIcon, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { useQuery } from "@tanstack/react-query";

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  currency: string;
  importance: 'low' | 'medium' | 'high';
  forecast?: string;
  previous?: string;
}

export default function Calendar() {
  const { data: events = [], isLoading } = useQuery<EconomicEvent[]>({
    queryKey: ['/api/econ/events']
  });

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-400 bg-red-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-green-400 bg-green-400/10';
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'high': return AlertTriangle;
      case 'medium': return TrendingUp;
      default: return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <div className="ml-20">
        <Header />
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2" data-testid="text-calendar-title">
                Economic Calendar
              </h1>
              <p className="text-gray-400" data-testid="text-calendar-subtitle">
                Track market-moving events and plan your trading strategy
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-gray-900/50 rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {events.length > 0 ? (
                  events.map((event) => {
                    const ImportanceIcon = getImportanceIcon(event.importance);
                    return (
                      <div
                        key={event.id}
                        className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:bg-gray-900/70 transition-all"
                        data-testid={`event-${event.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className={`p-2 rounded-lg ${getImportanceColor(event.importance)}`}>
                              <ImportanceIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg mb-1" data-testid={`text-event-title-${event.id}`}>
                                {event.title}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <span data-testid={`text-event-time-${event.id}`}>
                                  {event.time}
                                </span>
                                <span data-testid={`text-event-currency-${event.id}`}>
                                  {event.currency}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${getImportanceColor(event.importance)}`}>
                                  {event.importance.toUpperCase()}
                                </span>
                              </div>
                              {(event.forecast || event.previous) && (
                                <div className="flex items-center space-x-4 mt-2 text-sm">
                                  {event.forecast && (
                                    <span className="text-gray-300">
                                      Forecast: <strong>{event.forecast}</strong>
                                    </span>
                                  )}
                                  {event.previous && (
                                    <span className="text-gray-400">
                                      Previous: {event.previous}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No events scheduled</h3>
                    <p className="text-gray-400">Economic events will appear here when available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}