import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Calendar as CalIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { SuggestionDialog } from "@/components/suggestion-dialog";

interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'weight-to-carbs' | 'carbs-to-weight' | 'nutrition-label' | 'recipe';
  foodName?: string;
  weight?: number;
  carbs?: number;
  servingSize?: number;
  servingCarbs?: number;
  recipeName?: string;
  servings?: number;
  totalCarbs?: number;
  carbsPerServing?: number;
}

type FilterType = 'today' | 'last7days' | 'last30days' | 'alltime' | 'custom';

export default function HistoryPage() {
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [calcHistory, setCalcHistory] = useState<HistoryItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [filterType, setFilterType] = useState<FilterType>('alltime');

  // Load full history from localStorage on mount and when it changes
  useEffect(() => {
    const loadHistory = () => {
      const storedHistory = localStorage.getItem('carbpal_calc_history');
      if (storedHistory) {
        try {
          setCalcHistory(JSON.parse(storedHistory));
        } catch (e) {
          console.error('Failed to load calculation history', e);
        }
      } else {
        setCalcHistory([]);
      }
    };

    // Load initially
    loadHistory();

    // Listen for storage events (when localStorage changes in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'carbpal_calc_history') {
        loadHistory();
      }
    };

    // Listen for custom event (when localStorage changes in same tab)
    const handleHistoryChange = () => {
      loadHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('carbpal_history_changed', handleHistoryChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('carbpal_history_changed', handleHistoryChange);
    };
  }, []);

  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filterType) {
      case 'today':
        const endOfToday = new Date(today);
        endOfToday.setDate(endOfToday.getDate() + 1);
        return { start: today, end: endOfToday };
      case 'last7days':
        const last7days = new Date(today);
        last7days.setDate(today.getDate() - 6);
        const endOf7Days = new Date(today);
        endOf7Days.setDate(endOf7Days.getDate() + 1);
        return { start: last7days, end: endOf7Days };
      case 'last30days':
        const last30days = new Date(today);
        last30days.setDate(today.getDate() - 29);
        const endOf30Days = new Date(today);
        endOf30Days.setDate(endOf30Days.getDate() + 1);
        return { start: last30days, end: endOf30Days };
      case 'custom':
        if (selectedDate) {
          const customStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          const customEnd = new Date(customStart);
          customEnd.setDate(customEnd.getDate() + 1);
          return { start: customStart, end: customEnd };
        }
        return null;
      case 'alltime':
      default:
        return null;
    }
  }, [filterType, selectedDate, calcHistory.length]);

  // Filter history by date range
  const filteredHistory = useMemo(() => {
    if (!dateRange) return calcHistory;

    return calcHistory.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= dateRange.start && itemDate < dateRange.end;
    });
  }, [calcHistory, dateRange]);

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};

    filteredHistory.forEach(item => {
      const dateKey = new Date(item.timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    return groups;
  }, [filteredHistory]);

  // Handle quick filter button click
  const handleFilterClick = (type: FilterType) => {
    setFilterType(type);
    if (type !== 'custom') {
      setSelectedDate(undefined);
    }
  };

  // Handle custom date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setFilterType('custom');
    }
  };

  // Get display title based on filter
  const getFilterTitle = () => {
    switch (filterType) {
      case 'today':
        return 'Today';
      case 'last7days':
        return 'Last 7 Days';
      case 'last30days':
        return 'Last 30 Days';
      case 'custom':
        if (selectedDate) {
          return selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        }
        return 'Custom Date';
      case 'alltime':
      default:
        return 'All Calculations';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <PageHeader
        icon={History}
        title="Calculation History"
        description="Complete running tally of all your calculations"
        showSidebarTrigger={true}
        onSuggestionClick={() => setSuggestionDialogOpen(true)}
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-6 md:pb-8">

        {/* Quick Filter Buttons - Mobile (Full Width) */}
        <div className="md:hidden mb-6">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={filterType === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterClick('today')}
              data-testid="filter-today"
            >
              Today
            </Button>
            <Button
              variant={filterType === 'last7days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterClick('last7days')}
              data-testid="filter-last7days"
            >
              Last 7 Days
            </Button>
            <Button
              variant={filterType === 'last30days' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterClick('last30days')}
              data-testid="filter-last30days"
            >
              Last 30 Days
            </Button>
            <Button
              variant={filterType === 'alltime' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterClick('alltime')}
              data-testid="filter-alltime"
            >
              All Time
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          {/* Filter Sidebar - Desktop Only */}
          <Card className="hidden md:block p-4 h-fit">
            <div className="mb-4">
              <h3 className="font-semibold mb-1">Filter by Date</h3>
              <p className="text-xs text-muted-foreground">
                Quick filters or select custom date
              </p>
            </div>

            {/* Quick Filter Buttons */}
            <div className="space-y-2 mb-4">
              <Button
                variant={filterType === 'today' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleFilterClick('today')}
                data-testid="filter-today-desktop"
              >
                Today
              </Button>
              <Button
                variant={filterType === 'last7days' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleFilterClick('last7days')}
                data-testid="filter-last7days-desktop"
              >
                Last 7 Days
              </Button>
              <Button
                variant={filterType === 'last30days' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleFilterClick('last30days')}
                data-testid="filter-last30days-desktop"
              >
                Last 30 Days
              </Button>
              <Button
                variant={filterType === 'alltime' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => handleFilterClick('alltime')}
                data-testid="filter-alltime-desktop"
              >
                All Time
              </Button>
            </div>

            {/* Custom Date Picker */}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-3">
                Or select a specific date:
              </p>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md"
                data-testid="calendar-filter"
              />
            </div>
          </Card>

          {/* History Items */}
          <div>
            {/* Summary Card */}
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {getFilterTitle()}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredHistory.length} {filteredHistory.length === 1 ? "calculation" : "calculations"}
                  </p>
                </div>
              </div>
            </Card>

            {/* History List */}
            {filteredHistory.length === 0 ? (
              <Card className="p-12 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filterType === 'alltime'
                    ? "No calculation history yet. Start calculating to build your history!"
                    : "No calculations for this period"
                  }
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedHistory).map(([dateKey, items]) => (
                  <div key={dateKey}>
                    {(filterType === 'alltime' || filterType === 'last7days' || filterType === 'last30days') && (
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <CalIcon className="h-4 w-4" />
                        {dateKey}
                      </h3>
                    )}
                    <div className="space-y-2">
                      {items.map((item) => (
                        <Card
                          key={item.id}
                          data-testid={`history-item-${item.id}`}
                          className="p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              {item.type === 'weight-to-carbs' && (
                                <p className="text-sm">
                                  <span className="font-medium">{item.foodName}</span>: {item.weight}g → <span className="font-mono text-primary font-semibold">{item.carbs}g carbs</span>
                                </p>
                              )}
                              {item.type === 'carbs-to-weight' && (
                                <p className="text-sm">
                                  <span className="font-medium">{item.foodName}</span>: {item.carbs}g carbs → <span className="font-mono text-primary font-semibold">{item.weight}g</span>
                                </p>
                              )}
                              {item.type === 'nutrition-label' && (
                                <p className="text-sm">
                                  Nutrition Label: {item.servingSize}g serving ({item.servingCarbs}g carbs) × {item.weight}g = <span className="font-mono text-primary font-semibold">{item.carbs}g carbs</span>
                                </p>
                              )}
                              {item.type === 'recipe' && (
                                <p className="text-sm">
                                  Recipe: <span className="font-medium">{item.recipeName}</span> ({item.servings} servings) = <span className="font-mono text-primary font-semibold">{Math.round((item.carbsPerServing || 0) * 10) / 10}g carbs/serving</span>
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SuggestionDialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      />
    </div>
  );
}
