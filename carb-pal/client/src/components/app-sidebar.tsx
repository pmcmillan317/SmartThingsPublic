import { Calculator, Clock, Settings, Moon, Sun, ChefHat } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { CarbPalLogo } from "./carbpal-logo";

const menuItems = [
  { title: "Calculator", url: "/", icon: Calculator },
  { title: "My Foods", url: "/my-foods", icon: ChefHat },
  { title: "History", url: "/history", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="px-4 py-6">
            <div className="flex items-center gap-3 mb-1">
              <CarbPalLogo size={28} />
              <h1 className="text-2xl font-bold text-primary">CarbPal</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Your carb calculation companion</p>
          </div>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.url}>
                      <SidebarMenuButton
                        data-testid={`sidebar-${item.title.toLowerCase().replace(' ', '-')}`}
                        className={isActive ? "bg-sidebar-accent" : ""}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
          className="w-full justify-start gap-2"
        >
          {theme === "light" ? (
            <>
              <Moon className="h-4 w-4" />
              <span>Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="h-4 w-4" />
              <span>Light Mode</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
