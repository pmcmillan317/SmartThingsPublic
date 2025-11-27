import { useQuery } from "@tanstack/react-query";
import { ProgressCircle } from "@/components/progress-circle";
import { MealLogCard } from "@/components/meal-log-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Link } from "wouter";
import { type MealLog, type DailySummary } from "@shared/schema";
import { mealStorage } from "@/lib/meal-storage";
import { useMemo } from "react";

export default function Dashboard() {
  const today = new Date().toISOString().split("T")[0];

  // Load meals from localStorage
  const recentLogs = useMemo(() => mealStorage.getRecentMeals(10), []);
  const todayMeals = useMemo(() => mealStorage.getMealsByDate(today), [today]);

  // Calculate summary from localStorage
  const summary: DailySummary = useMemo(() => {
    const breakdown = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Snack: 0,
    };

    let totalCarbs = 0;

    todayMeals.forEach((log) => {
      totalCarbs += log.carbsCalculated;
      breakdown[log.mealType] += log.carbsCalculated;
    });

    return {
      date: today,
      totalCarbs,
      mealCount: todayMeals.length,
      breakdown,
    };
  }, [today, todayMeals]);

  const summaryLoading = false;
  const logsLoading = false;

  const dailyGoal = 300; // Default goal in grams
  const currentCarbs = summary?.totalCarbs || 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Today's Summary</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric"
            })}
          </p>
        </div>

        {/* Daily Summary Card */}
        <Card className="p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Progress Circle */}
            <div className="flex-shrink-0">
              {summaryLoading ? (
                <div className="w-[200px] h-[200px] rounded-full bg-muted animate-pulse" />
              ) : (
                <ProgressCircle
                  value={currentCarbs}
                  max={dailyGoal}
                  size={200}
                  strokeWidth={14}
                />
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 w-full">
              <h2 className="text-xl font-semibold mb-4">Daily Progress</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Carbs</p>
                  <p className="text-2xl font-mono font-semibold" data-testid="total-carbs">
                    {currentCarbs.toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Daily Goal</p>
                  <p className="text-2xl font-mono font-semibold">
                    {dailyGoal}g
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Meals Logged</p>
                  <p className="text-2xl font-mono font-semibold" data-testid="meal-count">
                    {summary?.mealCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                  <p className="text-2xl font-mono font-semibold">
                    {Math.max(0, dailyGoal - currentCarbs).toFixed(1)}g
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Meal Breakdown */}
        {summary && summary.mealCount > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">Breakdown by Meal</h3>
            <div className="space-y-3">
              {Object.entries(summary.breakdown).map(([mealType, carbs]) => {
                if (carbs === 0) return null;
                const percentage = (carbs / currentCarbs) * 100;
                return (
                  <div key={mealType}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{mealType}</span>
                      <span className="text-sm font-mono text-muted-foreground">
                        {carbs.toFixed(1)}g
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Recent Meals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Meals</h2>
            <Link href="/history">
              <a className="text-sm text-primary hover:underline" data-testid="link-view-all">
                View All
              </a>
            </Link>
          </div>

          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentLogs.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No meals logged yet today</p>
              <Link href="/search">
                <a>
                  <Button data-testid="button-log-first-meal">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Your First Meal
                  </Button>
                </a>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentLogs.slice(0, 5).map((log) => (
                <MealLogCard key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        <Link href="/search">
          <a className="md:hidden">
            <Button
              size="lg"
              className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
              data-testid="button-quick-add"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </a>
        </Link>
      </div>
    </div>
  );
}
