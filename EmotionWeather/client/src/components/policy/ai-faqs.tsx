import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HelpCircle, Loader2, RefreshCw, AlertCircle, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

interface FAQ {
  question: string;
  answer: string;
}

interface AIFAQsProps {
  policyId: string;
  policyTitle: string;
}

export function AIFAQs({ policyId, policyTitle }: AIFAQsProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractFAQs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/extract-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ policyId }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract policy information');
      }

      const result = await response.json();
      setFaqs(result.faqs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    extractFAQs();
  }, [policyId]);

  if (loading && faqs.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <p className="text-muted-foreground">AI is extracting frequently asked questions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HelpCircle className="h-6 w-6 text-purple-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Frequently Asked Questions</h3>
              <p className="text-sm text-muted-foreground">AI-generated common questions and answers</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-blue-600" />
            <Button 
              onClick={extractFAQs} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {faqs.length > 0 ? (
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-l-4 border-purple-400 pl-6 py-4 bg-purple-50 rounded-lg"
              >
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-start">
                  <HelpCircle className="h-5 w-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                  {faq.question}
                </h4>
                <p className="text-gray-700 leading-relaxed pl-7">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No FAQs identified</p>
            <p className="text-sm">AI analysis couldn't generate relevant questions from the policy text</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}