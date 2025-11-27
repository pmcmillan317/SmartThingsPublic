import { LucideIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  showIcon?: boolean;
  showSidebarTrigger?: boolean;
  onSuggestionClick?: () => void;
}

export function PageHeader({ icon: Icon, title, description, showIcon = true, showSidebarTrigger = false, onSuggestionClick }: PageHeaderProps) {
  return (
    <div className="mb-6 md:mb-8">
      {/* Full-width green banner extending edge-to-edge */}
      <div className="bg-primary px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Sidebar trigger on desktop only */}
            {showSidebarTrigger && (
              <div className="hidden md:flex flex-shrink-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white hover:bg-white/10" />
              </div>
            )}
            {Icon && showIcon && <Icon className="h-6 w-6 md:h-8 md:w-8 text-white flex-shrink-0" />}
            <h1 className="text-lg md:text-2xl font-semibold text-white truncate min-w-0 flex-1">{title}</h1>
            {onSuggestionClick && (
              <button
                onClick={onSuggestionClick}
                className="flex-shrink-0 h-6 w-6 md:h-7 md:w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                data-testid="button-open-suggestion"
                aria-label="Send suggestion"
              >
                <span className="text-sm md:text-base font-semibold">?</span>
              </button>
            )}
          </div>
          {description && (
            <p className="text-white/90 mt-2 text-sm md:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
