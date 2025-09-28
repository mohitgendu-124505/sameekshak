import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { CurrentPolicyProvider } from "@/contexts/CurrentPolicyContext";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Dashboard from "@/pages/dashboard";
import Voting from "@/pages/voting";
import EmotionMap from "@/pages/emotion-map";
import Summary from "@/pages/summary";
import Manage from "@/pages/manage";
import PolicyList from "@/pages/policy-list";
import PolicyDetail from "@/pages/policy-detail";
import Analytics from "@/pages/analytics";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar 
        isCollapsed={sidebarCollapsed} 
        setIsCollapsed={setSidebarCollapsed} 
      />
      
      {/* Main Content Area */}
      <motion.div
        initial={false}
        animate={{ 
          marginLeft: sidebarCollapsed ? 64 : 320,
          width: `calc(100% - ${sidebarCollapsed ? 64 : 320}px)`
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 flex flex-col"
      >
        {/* Top Header Bar */}
        <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center sticky top-0 z-30">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold text-foreground"
            >
              Policy Feedback Platform
            </motion.div>
          </AnimatePresence>
          
          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <User className="h-4 w-4" />
              <span className="text-muted-foreground">Welcome, {user?.name}</span>
              {user?.role === 'admin' && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  Admin
                </span>
              )}
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
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/voting" component={Voting} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/emotion-map" component={EmotionMap} />
              <Route path="/summary" component={Summary} />
              <Route path="/manage" component={Manage} />
              <Route path="/policies" component={PolicyList} />
              <Route path="/policy/:id" component={PolicyDetail} />
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Login />;
  }
  
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CurrentPolicyProvider>
            <SocketProvider>
              <Router />
              <Toaster />
            </SocketProvider>
          </CurrentPolicyProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
