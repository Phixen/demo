import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../componets/ui/card';
import { Input } from '../../componets/ui/input';
import { Button } from '../../componets/ui/button';
import { Alert, AlertDescription } from '../../componets/ui/alert';
import { Loader2, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MLAnalysisData {
  sector1: string;
  sector2: string;
  csvFile1: File | null;
  csvFile2: File | null;
  riskFactor: string;
}

interface MLResults {
  predictions: {
    sector1: number[];
    sector2: number[];
  };
  graphData: Array<{
    name: string;
    [key: string]: string | number;
  }>;
  optimalWeights: {
    sector1: number;
    sector2: number;
  };
}

const INITIAL_FORM_DATA: MLAnalysisData = {
  sector1: '',
  sector2: '',
  csvFile1: null,
  csvFile2: null,
  riskFactor: '0.5',
};

const MLAnalysis: React.FC = () => {
  const [formData, setFormData] = useState<MLAnalysisData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MLResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'csvFile1' | 'csvFile2') => {
    const file = e.target.files?.[0];
    setFormData(prev => ({
      ...prev,
      [field]: file || null
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const formPayload = new FormData();
      formPayload.append('sector1', formData.sector1);
      formPayload.append('sector2', formData.sector2);
      if (formData.csvFile1) formPayload.append('csvFile1', formData.csvFile1);
      if (formData.csvFile2) formPayload.append('csvFile2', formData.csvFile2);
      formPayload.append('riskFactor', formData.riskFactor);

      const response = await fetch('http://127.0.0.1:5000/portfolio_optimization', {
        method: 'POST',
        body: formPayload,
        // Remove headers as FormData sets the correct Content-Type automatically
        // Add mode and credentials
        mode: 'cors',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      setResults(data);
    } catch (err) {
      console.error('API Error:', err); // For debugging
      setError(err instanceof Error ? err.message : 'Failed to connect to the server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.sector1 !== '' && 
                     formData.sector2 !== '' && 
                     formData.csvFile1 !== null && 
                     formData.csvFile2 !== null && 
                     formData.riskFactor !== '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Portfolio Optimization Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="sector1"
            placeholder="First Sector Name"
            value={formData.sector1}
            onChange={handleInputChange}
          />
          <Input
            name="sector2"
            placeholder="Second Sector Name"
            value={formData.sector2}
            onChange={handleInputChange}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium">First Sector CSV</label>
            <Input
              name="csvFile1"
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange(e, 'csvFile1')}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Second Sector CSV</label>
            <Input
              name="csvFile2"
              type="file"
              accept=".csv"
              onChange={(e) => handleFileChange(e, 'csvFile2')}
            />
          </div>
          <Input
            name="riskFactor"
            placeholder="Risk Factor (0-1)"
            type="number"
            min="0"
            max="1"
            step="0.1"
            className="col-span-full"
            value={formData.riskFactor}
            onChange={handleInputChange}
          />
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={loading || !isFormValid}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Run Portfolio Analysis'
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Optimal Portfolio Weights</h4>
                <div className="bg-gray-100 p-4 rounded">
                  <p>{formData.sector1}: {results.optimalWeights.sector1}%</p>
                  <p>{formData.sector2}: {results.optimalWeights.sector2}%</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1">Price Predictions</h4>
                <div className="bg-gray-100 p-4 rounded">
                  <p className="mb-2">{formData.sector1}: ${results.predictions.sector1[0]}</p>
                  <p>{formData.sector2}: ${results.predictions.sector2[0]}</p>
                </div>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer>
                <LineChart data={results.graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={formData.sector1} 
                    stroke="#8884d8" 
                    name={`${formData.sector1} Return (%)`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={formData.sector2} 
                    stroke="#82ca9d" 
                    name={`${formData.sector2} Volatility (%)`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MLAnalysis;