import { useState, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  FileText, 
  BarChart3, 
  Vote,
  Bell, 
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  MapPin,
  TrendingUp,
  MessageCircle,
  Lightbulb,
  PieChart,
  Cloud,
  Eye,
  Plus,
  Upload,
  Filter,
  Building,
  Wheat,
  Heart,
  Briefcase,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";

interface AppSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function AppSidebar({ isCollapsed, setIsCollapsed }: AppSidebarProps) {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [policyOpen, setPolicyOpen] = useState(true);

  // Fetch data for sidebar counts
  const { data: policies } = useQuery({
    queryKey: ["/api/policies"],
    queryFn: async () => {
      const response = await fetch("/api/policies");
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      return data.policies || data; // Handle both old and new response formats
    }
  });

  const { data: currentPolicy } = useQuery({
    queryKey: ["/api/current-policy"],
    queryFn: async () => {
      const response = await fetch("/api/current-policy");
      if (!response.ok) throw new Error("Failed to fetch current policy");
      return response.json();
    }
  });

  // Fetch policy summary for counts
  const { data: policySummary } = useQuery({
    queryKey: ["/api/policies/summary"],
    queryFn: async () => {
      const response = await fetch("/api/policies/summary");
      if (!response.ok) throw new Error("Failed to fetch policy summary");
      return response.json();
    }
  });

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/policies?search=${encodeURIComponent(query)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setSearchSuggestions(data.policies || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  // Handle search input changes
  useEffect(() => {
    const cleanup = debouncedSearch(searchQuery);
    return cleanup;
  }, [searchQuery, debouncedSearch]);

  // Handle search enter key
  const handleSearchEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // TODO: Navigate to policy list page with search results
      setShowSuggestions(false);
      console.log("Navigate to search results:", searchQuery);
    }
  };

  // Dynamic policy categories based on API data
  const policyCategories = [
    { name: "Agriculture", icon: Wheat, count: policySummary?.categories?.Agriculture || 0, color: "bg-green-100 text-green-800" },
    { name: "Business", icon: Briefcase, count: policySummary?.categories?.Business || 0, color: "bg-blue-100 text-blue-800" },
    { name: "Health", icon: Heart, count: policySummary?.categories?.Health || 0, color: "bg-red-100 text-red-800" },
    { name: "Education", icon: Users, count: policySummary?.categories?.Education || 0, color: "bg-purple-100 text-purple-800" },
  ].filter(category => category.count > 0);

  const sidebarWidth = isCollapsed ? "w-16" : "w-80";
  
  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 64 : 320 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border z-40 flex flex-col",
        sidebarWidth
      )}
    >
      {/* Logo & Toggle */}
      <div className="p-4 flex items-center justify-between border-b border-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">eS</span>
              </div>
              <span className="font-semibold text-lg text-foreground">e.Sameekshak</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
        <div className="p-4 space-y-6" tabIndex={-1}>
          {/* Search Bar */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search policies, categories, keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchEnter}
                    onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="pl-10"
                    aria-label="Search policies"
                    role="searchbox"
                    aria-expanded={showSuggestions}
                    aria-describedby={showSuggestions ? "search-suggestions" : undefined}
                  />
                  
                  {/* Live Search Suggestions */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-auto"
                      role="listbox"
                      id="search-suggestions"
                      aria-label="Search suggestions"
                    >
                      {searchSuggestions.map((policy) => (
                        <div
                          key={policy.id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b border-border last:border-b-0"
onClick={() => {
                            setSearchQuery("");
                            setShowSuggestions(false);
                            window.location.href = `/policy/${policy.id}`;
                          }}
                        >
                          <div className="font-medium truncate">{policy.title}</div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {policy.description}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dashboard Link */}
          <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/">
              <div className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                location === "/" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}>
                <Home className="h-5 w-5" />
                {!isCollapsed && <span className="font-medium">Dashboard</span>}
              </div>
            </Link>
          </motion.div>

          {/* Policy Section */}
          <div className="space-y-2">
            <Collapsible open={policyOpen} onOpenChange={setPolicyOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-accent rounded-md">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5" />
                  {!isCollapsed && <span>Policies</span>}
                </div>
                {!isCollapsed && (
                  <motion.div
                    animate={{ rotate: policyOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-6 space-y-2"
                    >
                      <div className="flex items-center justify-between px-3 py-1 text-sm text-muted-foreground">
                        <span>Total Policies</span>
                        <Badge variant="secondary">{policySummary?.total || 0}</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-3 py-1 text-xs text-muted-foreground">
                          <span>Categories</span>
                          <Filter className="h-3 w-3" />
                        </div>
                        
                        {policyCategories.map((category) => (
                          <Link key={category.name} href={`/policies?category=${encodeURIComponent(category.name)}`}>
                            <motion.div
                              whileHover={{ x: 4 }}
                              className="flex items-center justify-between px-3 py-2 hover:bg-accent rounded-md cursor-pointer"
                            >
                              <div className="flex items-center space-x-2">
                                <category.icon className="h-4 w-4" />
                                <span className="text-sm">{category.name}</span>
                              </div>
                              <Badge className={category.color} variant="secondary">
                                {category.count}
                              </Badge>
                            </motion.div>
                          </Link>
                        ))}
                      </div>

                      <Separator />
                      
                      <div className="space-y-1">
                        <div className="px-3 py-1 text-xs text-muted-foreground">Policy Type</div>
                        <Link href="/policies?search=central">
                          <div className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm">
                            <div className="flex items-center justify-between">
                              <span>Central Policies</span>
                              <Badge variant="secondary">{policySummary?.central || 0}</Badge>
                            </div>
                          </div>
                        </Link>
                        <Link href="/policies?search=state">
                          <div className="px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm">
                            <div className="flex items-center justify-between">
                              <span>State Policies</span>
                              <Badge variant="secondary">{policySummary?.state || 0}</Badge>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Browse All Policies Button */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-4"
            >
              <Link href="/policies" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Browse All Policies
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Analytics Section */}
          <div className="space-y-2">
            <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-accent rounded-md">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-5 w-5" />
                  {!isCollapsed && <span>Analytics</span>}
                </div>
                {!isCollapsed && (
                  <motion.div
                    animate={{ rotate: analyticsOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-6 space-y-1"
                    >
                      <Link href="/voting">
                        <motion.div whileHover={{ x: 4 }} className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                          location === "/voting" 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}>
                          <Eye className="h-4 w-4" />
                          <span>Vote & Comment</span>
                        </motion.div>
                      </Link>
                      
                      <Link href="/analytics">
                        <motion.div whileHover={{ x: 4 }} className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                          location === "/analytics" 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}>
                          <PieChart className="h-4 w-4" />
                          <span>Vote Distribution</span>
                        </motion.div>
                      </Link>
                      
                      <motion.div whileHover={{ x: 4 }} className="flex items-center space-x-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>Graphs</span>
                      </motion.div>
                      
                      <Link href="/summary">
                        <motion.div whileHover={{ x: 4 }} className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                          location === "/summary" 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}>
                          <Lightbulb className="h-4 w-4" />
                          <span>AI Insights</span>
                        </motion.div>
                      </Link>
                      
                      <motion.div whileHover={{ x: 4 }} className="flex items-center space-x-2 px-3 py-2 hover:bg-accent rounded-md cursor-pointer text-sm">
                        <Cloud className="h-4 w-4" />
                        <span>Word Cloud</span>
                      </motion.div>
                      
                      <Link href="/emotion-map">
                        <motion.div whileHover={{ x: 4 }} className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors",
                          location === "/emotion-map" 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}>
                          <MapPin className="h-4 w-4" />
                          <span>Map Visualization</span>
                        </motion.div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Vote & Comment */}
          <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/voting">
              <div className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                location === "/voting" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}>
                <Vote className="h-5 w-5" />
                {!isCollapsed && <span className="font-medium">Vote & Comment</span>}
              </div>
            </Link>
          </motion.div>

          {/* Notifications */}
          <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
            <div className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors">
              <Bell className="h-5 w-5" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className="font-medium">Notifications</span>
                  <Badge className="bg-red-100 text-red-800">3</Badge>
                </div>
              )}
            </div>
          </motion.div>

          {/* Manage Policy */}
          <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/manage">
              <div className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                location === "/manage" 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}>
                <Settings className="h-5 w-5" />
                {!isCollapsed && (
                  <div className="flex-1">
                    <div className="font-medium">Manage Policy</div>
                    <div className="text-xs text-muted-foreground">Admin Only</div>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>

          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Separator />
              
              {/* Quick Actions */}
              <div className="space-y-2">
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Quick Actions</div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="sm" className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Policy
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="sm" className="w-full justify-start" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}