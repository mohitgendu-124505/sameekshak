import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import axios from "axios";

interface Policy {
  id: string;
  title: string;
  description: string;
  category?: string;
  scope: string;
  meta?: any;
  aiExtracted: boolean;
  createdAt: string;
  updatedAt: string;
  benefits?: string;
  eligibility?: string;
  faqs?: string;
  extractedAt?: string;
}

interface CurrentPolicyContextType {
  currentPolicy: Policy | null;
  setCurrentPolicy: (policy: Policy | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshPolicy: () => Promise<void>;
}

const CurrentPolicyContext = createContext<CurrentPolicyContextType | undefined>(undefined);

export function CurrentPolicyProvider({ children }: { children: ReactNode }) {
  const [currentPolicy, setCurrentPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Check URL for policy parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const policyId = urlParams.get('policy');
    
    if (policyId) {
      loadPolicy(policyId);
    } else {
      // Load the first available policy as default
      loadFirstPolicy();
    }
  }, []);

  const loadPolicy = async (policyId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/policies/${policyId}`);
      setCurrentPolicy(response.data);
      
      // Update URL without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.set('policy', policyId);
      window.history.replaceState({}, '', url.toString());
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load policy");
      console.error("Error loading policy:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFirstPolicy = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get("/api/policies?limit=1");
      if (response.data.policies && response.data.policies.length > 0) {
        const policy = response.data.policies[0];
        setCurrentPolicy(policy);
        
        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('policy', policy.id);
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load policies");
      console.error("Error loading first policy:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPolicy = async () => {
    if (currentPolicy) {
      await loadPolicy(currentPolicy.id);
    }
  };

  const handleSetCurrentPolicy = (policy: Policy | null) => {
    setCurrentPolicy(policy);
    
    if (policy) {
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('policy', policy.id);
      window.history.replaceState({}, '', url.toString());
    } else {
      // Remove policy from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('policy');
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <CurrentPolicyContext.Provider value={{
      currentPolicy,
      setCurrentPolicy: handleSetCurrentPolicy,
      isLoading,
      error,
      refreshPolicy
    }}>
      {children}
    </CurrentPolicyContext.Provider>
  );
}

export function useCurrentPolicy() {
  const context = useContext(CurrentPolicyContext);
  if (context === undefined) {
    throw new Error("useCurrentPolicy must be used within a CurrentPolicyProvider");
  }
  return context;
}
