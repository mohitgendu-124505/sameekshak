import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { username, logout } = useAuth();

  const navItems = [
    { path: "/", label: "Dashboard", testId: "nav-dashboard" },
    { path: "/voting", label: "Voting", testId: "nav-voting" },
    { path: "/emotion-map", label: "Emotion Map", testId: "nav-emotion-map" },
    { path: "/summary", label: "AI Summary", testId: "nav-summary" },
    { path: "/manage", label: "Manage Policies", testId: "nav-manage" },
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">eS</span>
            </div>
            <span className="font-semibold text-lg text-foreground">e.Sameekshak</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <span
                  data-testid={item.testId}
                  className={cn(
                    "nav-link px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer inline-block",
                    location === item.path
                      ? "active bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span className="text-muted-foreground">Welcome, {username}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>

        </div>
      </div>
    </nav>
  );
}
