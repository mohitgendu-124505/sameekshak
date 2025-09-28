import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Policy } from "@shared/schema";
import { Upload, Download, BarChart3, Brain, Trash2, Edit, Eye, Filter, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function Manage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);
  const [isAiAnalysisOpen, setIsAiAnalysisOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [isCsvUploadInEdit, setIsCsvUploadInEdit] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any>(null);
  const [csvJobs, setCsvJobs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newPolicy, setNewPolicy] = useState({
    title: "",
    description: "",
    category: "",
    scope: "central" as const,
    status: "draft" as const,
  });
  const [createPolicyCsvFile, setCreatePolicyCsvFile] = useState<File | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["/api/policies"],
  });

  const { data: csvJobsData, isLoading: isLoadingJobs } = useQuery({
    queryKey: ["/api/csvJobs"],
    refetchInterval: 5000, // Refetch every 5 seconds to show real-time updates
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (policyData: { title: string; description: string; category?: string; scope: string; status: string }) => {
      const response = await apiRequest("POST", "/api/policies", policyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy created!",
        description: "Your new policy has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewPolicy({ title: "", description: "", category: "", scope: "central", status: "draft" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, ...policyData }: { id: string } & Partial<Policy>) => {
      const response = await apiRequest("PUT", `/api/policies/${id}`, policyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy updated!",
        description: "The policy has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setEditingPolicy(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/policies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy deleted!",
        description: "The policy has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  // CSV Upload Handler for specific policy
  const handleCsvUpload = async (policyId?: string) => {
    if (!csvFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      if (policyId) {
        formData.append('policyId', policyId);
      }
      
      // Use direct fetch with cookie authentication to handle FormData properly
      const response = await fetch("/api/uploadCSV", {
        method: "POST",
        body: formData,
        credentials: "include", // This sends auth cookies like apiRequest does
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "CSV Upload Started!",
        description: `Processing ${result.totalRecords} records. Job ID: ${result.jobId}`,
      });
      
      // Start polling job status
      pollJobStatus(result.jobId);
      
      // Refresh policies after successful upload starts
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      setIsCsvUploadOpen(false);
      setCsvFile(null);
      
    } catch (error) {
      console.error("CSV upload failed:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload CSV file. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Job status polling
  const pollJobStatus = async (jobId: string) => {
    const maxPolls = 30; // Max 5 minutes of polling
    let pollCount = 0;
    
    const poll = async () => {
      try {
        const response = await apiRequest("GET", `/api/csvJobs/${jobId}`);
        const job = await response.json();
        
        if (job.status === 'completed') {
          toast({
            title: "CSV Upload Completed!",
            description: `Successfully processed ${job.processedRows} records. ${job.errors?.length || 0} errors.`,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
          return;
        } else if (job.status === 'failed') {
          toast({
            title: "CSV Upload Failed",
            description: `Upload failed: ${job.errors?.[0] || 'Unknown error'}`,
            variant: "destructive",
          });
          return;
        } else if (job.status === 'processing') {
          toast({
            title: "CSV Processing...",
            description: `Progress: ${job.progress}% (${job.processedRows}/${job.totalRows})`,
          });
        }
        
        // Continue polling if not finished and under max polls
        pollCount++;
        if (pollCount < maxPolls && (job.status === 'pending' || job.status === 'processing')) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        }
        
      } catch (error) {
        console.error("Failed to check job status:", error);
      }
    };
    
    // Start polling after 2 seconds
    setTimeout(poll, 2000);
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.title.trim() || !newPolicy.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First create the policy
      const policy = await createPolicyMutation.mutateAsync(newPolicy);
      
      // If CSV file is provided, upload it to the newly created policy
      if (createPolicyCsvFile && policy?.id) {
        toast({
          title: "Policy Created!",
          description: "Uploading CSV comments...",
        });
        
        const formData = new FormData();
        formData.append('csvFile', createPolicyCsvFile);
        
        // Upload CSV comments to the newly created policy
        const response = await fetch(`/api/uploadCSV?policyId=${policy.id}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (response.ok) {
          const result = await response.json();
          toast({
            title: "Policy & CSV Upload Started!",
            description: `Processing ${result.totalRecords} comments. Job ID: ${result.jobId}`,
          });
          pollJobStatus(result.jobId);
        } else {
          throw new Error(`CSV upload failed: ${response.status}`);
        }
      }
      
      // Reset form
      setIsCreateDialogOpen(false);
      setNewPolicy({ title: "", description: "", category: "", scope: "central", status: "draft" });
      setCreatePolicyCsvFile(null);
      
    } catch (error) {
      console.error("Policy creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create policy. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPolicy = (policy: Policy) => {
    setEditingPolicy({ ...policy });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePolicy = () => {
    if (!editingPolicy || !editingPolicy.title.trim() || !editingPolicy.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    updatePolicyMutation.mutate(editingPolicy);
  };

  const handleDeletePolicy = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this policy? This action cannot be undone.")) {
      deletePolicyMutation.mutate(id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPolicies.length === 0) {
      toast({
        title: "No policies selected",
        description: "Please select policies to delete.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedPolicies.length} selected policies? This action cannot be undone.`)) {
      // Delete all selected policies
      for (const id of selectedPolicies) {
        try {
          await deletePolicyMutation.mutateAsync(id);
        } catch (error) {
          console.error(`Failed to delete policy ${id}:`, error);
        }
      }
      setSelectedPolicies([]);
      toast({
        title: "Bulk delete completed!",
        description: `${selectedPolicies.length} policies have been deleted successfully.`,
      });
    }
  };

  const togglePolicySelection = (policyId: string) => {
    setSelectedPolicies(prev => 
      prev.includes(policyId) 
        ? prev.filter(id => id !== policyId)
        : [...prev, policyId]
    );
  };

  const selectAllPolicies = () => {
    if (selectedPolicies.length === filteredPolicies.length) {
      setSelectedPolicies([]);
    } else {
      setSelectedPolicies(filteredPolicies.map(p => p.id));
    }
  };

  const filteredPolicies = policies?.filter((policy: Policy) => {
    const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || policy.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary text-primary-foreground";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "under_review":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return "Draft";
    return status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-48"></div>
              <div className="h-4 bg-muted rounded w-64"></div>
            </div>
            <div className="h-10 bg-muted rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="manage-page-title">Manage Policies</h1>
          <p className="text-muted-foreground mt-1">Comprehensive admin dashboard for policy management</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-new-policy">
            + New Policy
          </Button>
          <Button variant="outline" onClick={() => setIsCsvUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
          <Button variant="outline" onClick={() => setIsAiAnalysisOpen(true)}>
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </Button>
          {selectedPolicies.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete} disabled={deletePolicyMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deletePolicyMutation.isPending ? "Deleting..." : `Delete (${selectedPolicies.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{policies?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded">
                <Badge className="bg-green-500 text-white">{policies?.filter((p: Policy) => p.status === 'active').length || 0}</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{policies?.filter((p: Policy) => p.status === 'active').length || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded">
                <Badge className="bg-yellow-500 text-white">{policies?.filter((p: Policy) => p.status === 'draft').length || 0}</Badge>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{policies?.filter((p: Policy) => p.status === 'draft').length || 0}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{selectedPolicies.length}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Jobs Monitoring */}
      {csvJobsData && csvJobsData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV Processing Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {csvJobsData.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                        {job.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {job.filename} - {job.totalRows} records
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Progress: {job.progress}%</span>
                      <span>Processed: {job.processedRows}/{job.totalRows}</span>
                      {job.errors && job.errors.length > 0 && (
                        <span className="text-red-600">{job.errors.length} errors</span>
                      )}
                    </div>
                    {job.status === 'processing' && (
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search policies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">

          {/* Enhanced Policy Grid */}
          {filteredPolicies.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPolicies.map((policy: Policy) => (
                <motion.div
                  key={policy.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`policy-card shadow-sm transition-all hover:shadow-md ${
                    selectedPolicies.includes(policy.id) ? 'ring-2 ring-primary' : ''
                  }`} data-testid={`manage-policy-card-${policy.id}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={selectedPolicies.includes(policy.id)}
                            onCheckedChange={() => togglePolicySelection(policy.id)}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground leading-tight" data-testid={`manage-policy-title-${policy.id}`}>
                              {policy.title}
                            </h3>
                          </div>
                        </div>
                        <Badge className={getStatusColor(policy.status)}>
                          {formatStatus(policy.status)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3" data-testid={`manage-policy-description-${policy.id}`}>
                        {policy.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-semibold text-foreground">0</div>
                          <div className="text-xs text-muted-foreground">Total Votes</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="text-lg font-semibold text-foreground">0%</div>
                          <div className="text-xs text-muted-foreground">Engagement</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleEditPolicy(policy)}
                          data-testid={`button-edit-policy-${policy.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          data-testid={`button-view-details-${policy.id}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeletePolicy(policy.id)}
                          data-testid={`button-delete-policy-${policy.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {searchTerm || filterStatus !== "all" ? "No matching policies" : "No Policies Yet"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || filterStatus !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "Get started by creating your first policy proposal or uploading a CSV file."
                  }
                </p>
                {(!searchTerm && filterStatus === "all") && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-policy">
                      Create Your First Policy
                    </Button>
                    <Button variant="outline" onClick={() => setIsCsvUploadOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Policy Management Table</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPolicies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">
                          <Checkbox 
                            checked={selectedPolicies.length === filteredPolicies.length && filteredPolicies.length > 0}
                            onCheckedChange={selectAllPolicies}
                          />
                        </th>
                        <th className="text-left p-2">Title</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Created</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPolicies.map((policy: Policy) => (
                        <tr key={policy.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Checkbox
                              checked={selectedPolicies.includes(policy.id)}
                              onCheckedChange={() => togglePolicySelection(policy.id)}
                            />
                          </td>
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{policy.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">{policy.description}</div>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge className={getStatusColor(policy.status)}>
                              {formatStatus(policy.status)}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {new Date(policy.createdAt || '').toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditPolicy(policy)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeletePolicy(policy.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No policies found matching your criteria.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Policy Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newPolicy.title}
                onChange={(e) => setNewPolicy({ ...newPolicy, title: e.target.value })}
                placeholder="Enter policy title"
                data-testid="input-policy-title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                placeholder="Enter policy description"
                rows={4}
                data-testid="textarea-policy-description"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={newPolicy.category}
                onValueChange={(value) => setNewPolicy({ ...newPolicy, category: value })}
              >
                <SelectTrigger data-testid="select-policy-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agriculture">Agriculture</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="scope">Policy Level</Label>
              <Select
                value={newPolicy.scope}
                onValueChange={(value) => setNewPolicy({ ...newPolicy, scope: value })}
              >
                <SelectTrigger data-testid="select-policy-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={newPolicy.status}
                onValueChange={(value) => setNewPolicy({ ...newPolicy, status: value })}
              >
                <SelectTrigger data-testid="select-policy-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Optional CSV Upload Section */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4" />
                <Label>Add Comments from CSV (Optional)</Label>
              </div>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCreatePolicyCsvFile(e.target.files?.[0] || null)}
                className="mb-2"
              />
              {createPolicyCsvFile && (
                <div className="text-sm text-muted-foreground mb-2">
                  Selected: {createPolicyCsvFile.name} ({(createPolicyCsvFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-medium mb-1">CSV Format for Comments:</p>
                <code className="text-xs">
                  commentId,text,author,city,state,lat,lon,createdAt<br/>
                  "1","Great policy","John Doe","San Francisco","CA","37.7749","-122.4194","2024-01-01"
                </code>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePolicy}
                disabled={createPolicyMutation.isPending}
                data-testid="button-create-policy"
              >
                {createPolicyMutation.isPending ? "Creating..." : "Create Policy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
          </DialogHeader>
          {editingPolicy && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editingPolicy.title}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, title: e.target.value })}
                  placeholder="Enter policy title"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editingPolicy.description}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  placeholder="Enter policy description"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingPolicy.category || ""}
                  onValueChange={(value) => setEditingPolicy({ ...editingPolicy, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Agriculture">Agriculture</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-scope">Policy Level</Label>
                <Select
                  value={editingPolicy.scope}
                  onValueChange={(value) => setEditingPolicy({ ...editingPolicy, scope: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCsvUploadInEdit(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add CSV Data
                </Button>
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdatePolicy}
                    disabled={updatePolicyMutation.isPending}
                  >
                    {updatePolicyMutation.isPending ? "Updating..." : "Update Policy"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={isCsvUploadOpen} onOpenChange={setIsCsvUploadOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Policies</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>CSV File *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Upload a CSV file with columns: title, description, status
              </p>
            </div>
            <div className="bg-muted p-4 rounded">
              <h4 className="font-medium mb-2">CSV Format Example:</h4>
              <code className="text-sm">
                title,description,status<br/>
                "Policy Title","Policy Description","draft"<br/>
                "Another Policy","Another Description","active"
              </code>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCsvUploadOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCsvUpload}
                disabled={!csvFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={isAiAnalysisOpen} onOpenChange={setIsAiAnalysisOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Policy Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">AI analysis powered by Gemini will provide insights on:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">Sentiment</div>
                    <div className="text-sm text-muted-foreground">Policy sentiment analysis</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">Topics</div>
                    <div className="text-sm text-muted-foreground">Key topic extraction</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">Insights</div>
                    <div className="text-sm text-muted-foreground">AI-powered recommendations</div>
                  </CardContent>
                </Card>
              </div>
              <p className="text-sm text-muted-foreground">
                {policies?.length || 0} policies available for analysis
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog for Edit Mode */}
      <Dialog open={isCsvUploadInEdit} onOpenChange={setIsCsvUploadInEdit}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add CSV Data to Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>CSV File *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Upload a CSV file with comments data for: {editingPolicy?.title}
              </p>
            </div>
            <div className="bg-muted p-4 rounded">
              <h4 className="font-medium mb-2">CSV Format Example:</h4>
              <code className="text-sm">
                text,mood,city,state,lat,lon<br/>
                "Great policy!","happy","Mumbai","Maharashtra","19.0760","72.8777"<br/>
                "Needs improvement","sad","Delhi","Delhi","28.7041","77.1025"
              </code>
            </div>
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsCsvUploadInEdit(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleCsvUpload(editingPolicy?.id)}
                disabled={!csvFile || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload CSV"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
