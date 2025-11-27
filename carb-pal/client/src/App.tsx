import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AuthProvider } from "@/lib/auth-context";
import Calculator from "@/pages/calculator";
import MyFoods from "@/pages/my-foods";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Pricing from "@/pages/pricing";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Calculator} />
      <Route path="/my-foods" component={MyFoods} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <MedicalDisclaimer />
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                {/* Desktop Sidebar */}
                <div className="hidden md:block">
                  <AppSidebar />
                </div>

                {/* Main Content */}
                <div className="flex flex-col flex-1 w-full min-w-0">
                  {/* Page Content */}
                  <main className="flex-1 overflow-y-auto p-0">
                    <Router />
                  </main>
                </div>

                {/* Mobile Navigation */}
                <MobileNav />
              </div>
            </SidebarProvider>
            <Toaster />
            <PWAInstallPrompt />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
