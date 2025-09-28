import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
  ComposedChart, RadialBarChart, RadialBar
} from "recharts";
import { 
  Search, Filter, Calendar, TrendingUp, Users, Target, 
  BarChart3, PieChart as PieChartIcon, Activity, FileText, X
} from "lucide-react";

const VOTE_COLORS = {
  happy: "#10b981",
  angry: "#ef4444", 
  neutral: "#6b7280",
  suggestion: "#3b82f6"
};

const voteConfig = [
  { type: "happy", emoji: "😀", label: "Happy", color: VOTE_COLORS.happy },
  { type: "angry", emoji: "😡", label: "Angry", color: VOTE_COLORS.angry },
  { type: "neutral", emoji: "😐", label: "Neutral", color: VOTE_COLORS.neutral },
  { type: "suggestion", emoji: "💡", label: "Suggestions", color: VOTE_COLORS.suggestion },
];

export default function Analytics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("engagement");
  const [chartType, setChartType] = useState<'pie' | 'donut' | 'bar' | 'stacked' | 'line' | 'area' | 'radial'>('pie');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);

  const searchParams = new URLSearchParams(useSearch());
  const policyParamId = searchParams.get("policy");

  // Fetch all policies for filtering
  const { data: allPolicies, isLoading: isLoadingPolicies } = useQuery({
    queryKey: ["/api/policies"],
    queryFn: async () => {
      const response = await fetch("/api/policies");
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      return data.policies || data;
    },
  });

  // Fetch vote statistics for all policies
  const { data: allVoteStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/policies", "all-stats"],
    queryFn: async () => {
      if (!allPolicies) return {};
      
      const statsPromises = allPolicies.map(async (policy: any) => {
        try {
          const response = await fetch(`/api/policies/${policy.id}/stats`);
          if (!response.ok) return { [policy.id]: { happy: 0, angry: 0, neutral: 0, suggestion: 0 } };
          const stats = await response.json();
          return { [policy.id]: stats.stats || { happy: 0, angry: 0, neutral: 0, suggestion: 0 } };
        } catch {
          return { [policy.id]: { happy: 0, angry: 0, neutral: 0, suggestion: 0 } };
        }
      });
      
      const statsArray = await Promise.all(statsPromises);
      return statsArray.reduce((acc, stat) => ({ ...acc, ...stat }), {});
    },
    enabled: !!allPolicies,
  });

  // Filter and search policies
  const filteredPolicies = useMemo(() => {
    if (!allPolicies) return [];
    
    let filtered = allPolicies.filter((policy: any) => {
      const matchesSearch = !searchQuery || 
        policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || policy.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || policy.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sort policies
    if (sortBy === "engagement") {
      filtered.sort((a: any, b: any) => {
        const aStats = allVoteStats?.[a.id] || { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
        const bStats = allVoteStats?.[b.id] || { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
        const aTotal = aStats.happy + aStats.angry + aStats.neutral + aStats.suggestion;
        const bTotal = bStats.happy + bStats.angry + bStats.neutral + bStats.suggestion;
        return bTotal - aTotal;
      });
    } else if (sortBy === "latest") {
      filtered.sort((a: any, b: any) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    } else if (sortBy === "alphabetical") {
      filtered.sort((a: any, b: any) => a.title.localeCompare(b.title));
    }

    return filtered;
  }, [allPolicies, allVoteStats, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Get selected policy for detailed view
  const selectedPolicy = selectedPolicyId ? 
    allPolicies?.find((p: any) => p.id === selectedPolicyId) : 
    policyParamId ? allPolicies?.find((p: any) => p.id === policyParamId) :
    filteredPolicies?.[0];

  const selectedStats = selectedPolicy ? allVoteStats?.[selectedPolicy.id] : null;

  // Prepare chart data  
  const chartData = selectedStats ? voteConfig.map(config => ({
    name: config.label,
    value: selectedStats[config.type as keyof typeof selectedStats] || 0,
    color: config.color,
    emoji: config.emoji,
    type: config.type
  })).filter(item => item.value > 0) : [];

  const totalVotes = chartData.reduce((sum, item) => sum + item.value, 0);

  // Prepare stacked/line chart data - time series simulation
  const stackedData = useMemo(() => {
    if (!selectedStats) return [];
    
    // Simulate time series data for demonstration
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      happy: Math.floor((selectedStats.happy || 0) * (0.8 + Math.random() * 0.4)),
      angry: Math.floor((selectedStats.angry || 0) * (0.8 + Math.random() * 0.4)),
      neutral: Math.floor((selectedStats.neutral || 0) * (0.8 + Math.random() * 0.4)),
      suggestion: Math.floor((selectedStats.suggestion || 0) * (0.8 + Math.random() * 0.4))
    }));
  }, [selectedStats]);

  // Prepare radial chart data
  const radialData = chartData.map((item, index) => ({
    ...item,
    fill: item.color,
    angle: totalVotes > 0 ? (item.value / totalVotes) * 360 : 0
  }));

  // Calculate engagement metrics
  const engagementMetrics = useMemo(() => {
    if (!filteredPolicies || !allVoteStats) return null;

    const totalPolicies = filteredPolicies.length;
    let totalEngagement = 0;
    let positiveVotes = 0;
    let negativeVotes = 0;
    let neutralVotes = 0;
    let suggestionVotes = 0;

    filteredPolicies.forEach((policy: any) => {
      const stats = allVoteStats[policy.id] || { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
      const policyTotal = stats.happy + stats.angry + stats.neutral + stats.suggestion;
      totalEngagement += policyTotal;
      positiveVotes += stats.happy;
      negativeVotes += stats.angry;
      neutralVotes += stats.neutral;
      suggestionVotes += stats.suggestion;
    });

    const avgEngagement = totalPolicies > 0 ? Math.round(totalEngagement / totalPolicies) : 0;

    return {
      totalPolicies,
      totalEngagement,
      avgEngagement,
      positiveVotes,
      negativeVotes,
      neutralVotes,
      suggestionVotes
    };
  }, [filteredPolicies, allVoteStats]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      active: "Active",
      draft: "Draft", 
      under_review: "Under Review",
      archived: "Archived"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      active: "bg-green-100 text-green-800",
      draft: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800", 
      archived: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoadingPolicies || isLoadingStats) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-32 bg-muted rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-muted rounded-xl"></div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">Vote Distribution Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of voting patterns and policy engagement across all policies
        </p>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 backdrop-blur-sm rounded-xl border border-border p-6 mb-8 shadow-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Agriculture">🌾 Agriculture</SelectItem>
                <SelectItem value="Business">💼 Business</SelectItem>
                <SelectItem value="Health">❤️ Health</SelectItem>
                <SelectItem value="Education">🎓 Education</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <TrendingUp className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagement">Most Engaging</SelectItem>
                <SelectItem value="latest">Latest First</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* Chart Type */}
            <Select value={chartType} onValueChange={(value) => setChartType(value as typeof chartType)}>
              <SelectTrigger>
                <BarChart3 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">🥧 Pie Chart</SelectItem>
                <SelectItem value="donut">🍩 Donut Chart</SelectItem>
                <SelectItem value="bar">📊 Bar Chart</SelectItem>
                <SelectItem value="stacked">📈 Stacked Bar</SelectItem>
                <SelectItem value="line">📉 Line Chart</SelectItem>
                <SelectItem value="area">🌊 Area Chart</SelectItem>
                <SelectItem value="radial">⭕ Radial Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {(categoryFilter !== "all" || searchQuery || statusFilter !== "all") && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {categoryFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {categoryFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter("all")} />
                </Badge>
              )}
              
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                </Badge>
              )}
              
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getStatusLabel(statusFilter)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Overview Metrics */}
      {engagementMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Policies</p>
                  <p className="text-2xl font-bold text-blue-900">{engagementMetrics.totalPolicies}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Engagement</p>
                  <p className="text-2xl font-bold text-green-900">{engagementMetrics.totalEngagement}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Avg per Policy</p>
                  <p className="text-2xl font-bold text-purple-900">{engagementMetrics.avgEngagement}</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Most Positive</p>
                  <p className="text-2xl font-bold text-orange-900">{engagementMetrics.positiveVotes}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Policy List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Policies ({filteredPolicies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto space-y-2 p-4">
                {filteredPolicies.map((policy: any) => {
                  const stats = allVoteStats?.[policy.id] || { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
                  const totalVotes = stats.happy + stats.angry + stats.neutral + stats.suggestion;
                  const isSelected = selectedPolicy?.id === policy.id;

                  return (
                    <motion.div
                      key={policy.id}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent'
                      }`}
                      onClick={() => setSelectedPolicyId(policy.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium line-clamp-2">{policy.title}</h4>
                        <Badge className={getStatusColor(policy.status)} variant="secondary">
                          {getStatusLabel(policy.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {policy.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {formatDate(policy.createdAt || '')}
                        </span>
                        <span className="font-medium text-primary">
                          {totalVotes} votes
                        </span>
                      </div>
                    </motion.div>
                  );
                })}

                {filteredPolicies.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No policies match your filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chart Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Vote Distribution
                  {selectedPolicy && (
                    <Badge variant="outline" className="ml-2">
                      {selectedPolicy.title}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {totalVotes} votes
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPolicy && chartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <>
                      {/* Pie Chart */}
                      {chartType === 'pie' && (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => [value, name]}
                            labelFormatter={() => 'Votes'}
                          />
                          <Legend />
                        </PieChart>
                      )}

                      {/* Donut Chart */}
                      {chartType === 'donut' && (
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                            outerRadius={100}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={1000}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => [value, name]}
                            labelFormatter={() => 'Votes'}
                          />
                          <Legend />
                        </PieChart>
                      )}

                      {/* Bar Chart */}
                      {chartType === 'bar' && (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar 
                            dataKey="value" 
                            fill="#8884d8"
                            animationDuration={600}
                            animationBegin={0}
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}

                      {/* Stacked Bar Chart */}
                      {chartType === 'stacked' && (
                        <BarChart data={stackedData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="happy" 
                            stackId="a" 
                            fill={VOTE_COLORS.happy}
                            animationDuration={800}
                            animationBegin={0}
                          />
                          <Bar 
                            dataKey="angry" 
                            stackId="a" 
                            fill={VOTE_COLORS.angry}
                            animationDuration={800}
                            animationBegin={200}
                          />
                          <Bar 
                            dataKey="neutral" 
                            stackId="a" 
                            fill={VOTE_COLORS.neutral}
                            animationDuration={800}
                            animationBegin={400}
                          />
                          <Bar 
                            dataKey="suggestion" 
                            stackId="a" 
                            fill={VOTE_COLORS.suggestion}
                            animationDuration={800}
                            animationBegin={600}
                          />
                        </BarChart>
                      )}

                      {/* Line Chart */}
                      {chartType === 'line' && (
                        <LineChart data={stackedData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="happy" 
                            stroke={VOTE_COLORS.happy}
                            strokeWidth={3}
                            dot={{ fill: VOTE_COLORS.happy, strokeWidth: 2, r: 4 }}
                            animationDuration={1000}
                            animationBegin={0}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="angry" 
                            stroke={VOTE_COLORS.angry}
                            strokeWidth={3}
                            dot={{ fill: VOTE_COLORS.angry, strokeWidth: 2, r: 4 }}
                            animationDuration={1000}
                            animationBegin={200}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="neutral" 
                            stroke={VOTE_COLORS.neutral}
                            strokeWidth={3}
                            dot={{ fill: VOTE_COLORS.neutral, strokeWidth: 2, r: 4 }}
                            animationDuration={1000}
                            animationBegin={400}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="suggestion" 
                            stroke={VOTE_COLORS.suggestion}
                            strokeWidth={3}
                            dot={{ fill: VOTE_COLORS.suggestion, strokeWidth: 2, r: 4 }}
                            animationDuration={1000}
                            animationBegin={600}
                          />
                        </LineChart>
                      )}

                      {/* Area Chart */}
                      {chartType === 'area' && (
                        <AreaChart data={stackedData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="happy" 
                            stackId="1"
                            stroke={VOTE_COLORS.happy}
                            fill={VOTE_COLORS.happy}
                            fillOpacity={0.6}
                            animationDuration={1200}
                            animationBegin={0}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="angry" 
                            stackId="1"
                            stroke={VOTE_COLORS.angry}
                            fill={VOTE_COLORS.angry}
                            fillOpacity={0.6}
                            animationDuration={1200}
                            animationBegin={300}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="neutral" 
                            stackId="1"
                            stroke={VOTE_COLORS.neutral}
                            fill={VOTE_COLORS.neutral}
                            fillOpacity={0.6}
                            animationDuration={1200}
                            animationBegin={600}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="suggestion" 
                            stackId="1"
                            stroke={VOTE_COLORS.suggestion}
                            fill={VOTE_COLORS.suggestion}
                            fillOpacity={0.6}
                            animationDuration={1200}
                            animationBegin={900}
                          />
                        </AreaChart>
                      )}

                      {/* Radial Chart */}
                      {chartType === 'radial' && (
                        <RadialBarChart data={radialData} innerRadius="20%" outerRadius="90%">
                          <RadialBar 
                            dataKey="value" 
                            cornerRadius={10} 
                            fill="#8884d8"
                            animationDuration={1000}
                            animationBegin={0}
                          >
                            {radialData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </RadialBar>
                          <Tooltip 
                            formatter={(value, name) => [value, name]}
                            labelFormatter={() => 'Votes'}
                          />
                          <Legend />
                        </RadialBarChart>
                      )}
                    </>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Data Available</p>
                    <p className="text-sm">
                      {selectedPolicy ? 'No votes yet for this policy' : 'Select a policy to view vote distribution'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}