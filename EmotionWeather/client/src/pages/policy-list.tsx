import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Policy } from "@shared/schema";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { Search, Filter, Calendar, FileText, ChevronLeft, ChevronRight, Eye, MessageCircle, ThumbsUp, X } from "lucide-react";
import { useSearch } from "wouter";

export default function PolicyList() {
  const searchParams = new URLSearchParams(useSearch());
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");
  
  const [searchQuery, setSearchQuery] = useState(searchParam || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [categoryFilter, setCategoryFilter] = useState(categoryParam || "all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Update state when URL parameters change
  useEffect(() => {
    setCategoryFilter(categoryParam || "all");
    setSearchQuery(searchParam || "");
  }, [categoryParam, searchParam]);

  // Fetch policies with pagination
  const { data: policyResponse, isLoading } = useQuery<{
    policies: Policy[];
    pagination: {
      current: number;
      total: number;
      count: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>({
    queryKey: ["/api/policies", currentPage, itemsPerPage, statusFilter, sortBy, searchQuery, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(sortBy && { sort: sortBy }),
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== "all" && { category: categoryFilter })
      });
      
      const response = await fetch(`/api/policies?${params}`);
      if (!response.ok) throw new Error("Failed to fetch policies");
      const data = await response.json();
      return {
        policies: data.policies || data,
        pagination: data.pagination || {
          current: 1,
          total: 1,
          count: data.length || 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  });

  // Fetch vote stats for each policy
  const { data: allVoteStats } = useQuery({
    queryKey: ["/api/policies", "all-stats"],
    queryFn: async () => {
      const response = await fetch("/api/policies/all-stats");
      if (!response.ok) return {};
      return response.json();
    }
  });

  const policies = policyResponse?.policies || [];
  const pagination = policyResponse?.pagination;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "draft":
        return "Draft";
      case "under_review":
        return "Under Review";
      case "archived":
        return "Archived";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading && policies.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">All Policies</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Browse and explore government policies, track their progress, and engage with public feedback
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}>
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
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
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
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="trending">Most Active</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters & Clear */}
            {(categoryFilter !== "all" || searchQuery || statusFilter !== "all") && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                
                {categoryFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {categoryFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        setCategoryFilter("all");
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchQuery}"
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        setSearchQuery("");
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getStatusLabel(statusFilter)}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => {
                        setStatusFilter("all");
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mr-2" />
            {pagination ? `${pagination.count} policies found` : `${policies.length} policies`}
          </div>
        </div>

        {/* Policy Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {policies.map((policy, index) => {
            const stats = allVoteStats?.[policy.id] || { happy: 0, angry: 0, neutral: 0, suggestion: 0 };
            const totalVotes = stats.happy + stats.angry + stats.neutral + stats.suggestion;
            
            return (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`text-xs px-3 py-1 ${getStatusColor(policy.status)}`}>
                        {getStatusLabel(policy.status)}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(policy.createdAt ? (typeof policy.createdAt === 'string' ? policy.createdAt : policy.createdAt.toISOString()) : '')}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                      {policy.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {policy.description}
                    </p>

                    {/* Vote Stats */}
                    <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {totalVotes}
                        </div>
                        <div className="flex items-center">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          {/* TODO: Add comment count */}
                          0
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <span>😀 {stats.happy}</span>
                        <span>😡 {stats.angry}</span>
                        <span>😐 {stats.neutral}</span>
                        <span>💡 {stats.suggestion}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Link href={`/policy/${policy.id}`} className="flex-1">
                        <Button size="sm" className="w-full group-hover:bg-primary/90">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/voting?policy=${policy.id}`}>
                        <Button size="sm" variant="outline">
                          Vote
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center space-x-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {pagination.total > 5 && (
                <span className="text-muted-foreground">...</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Empty State */}
        {policies.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No policies found</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search filters"
                : "There are no policies available at the moment"}
            </p>
            <Link href="/manage">
              <Button>Add New Policy</Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}