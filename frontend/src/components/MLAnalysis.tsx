import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../componets/ui/card';
import { Input } from '../../componets/ui/input';
import { Button } from '../../componets/ui/button';
import { Alert, AlertDescription } from '../../componets/ui/alert';
import { Loader2, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MLAnalysisData, MLResults } from '../types';

const INITIAL_FORM_DATA: MLAnalysisData = {
  sector1: '',
  sector2: '',
  csvFile1: null,
  csvFile2: null,
  riskFactor: '',
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

      // Create a FormData object to send the files
      const formPayload = new FormData();
      formPayload.append('sector1', formData.sector1);
      formPayload.append('sector2', formData.sector2);
      formPayload.append('csvFile1', formData.csvFile1 as File);
      formPayload.append('csvFile2', formData.csvFile2 as File);
      formPayload.append('riskFactor', formData.riskFactor);

      const response = await fetch('/portfolio_optimization', {
        method: 'POST',
        body: formPayload,
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = Object.values(formData).every(value => value !== '' && value !== null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          ML Analysis Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="sector1"
            placeholder="First Sector"
            value={formData.sector1}
            onChange={handleInputChange}
          />
          <Input
            name="sector2"
            placeholder="Second Sector"
            value={formData.sector2}
            onChange={handleInputChange}
          />
          <Input
            name="csvFile1"
            type="file"
            placeholder="First CSV File"
            onChange={(e) => handleFileChange(e, 'csvFile1')}
          />
          <Input
            name="csvFile2"
            type="file"
            placeholder="Second CSV File"
            onChange={(e) => handleFileChange(e, 'csvFile2')}
          />
          <Input
            name="riskFactor"
            placeholder="Risk Factor"
            type="number"
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
            'Run ML Analysis'
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
                <h4 className="font-medium mb-1">{formData.sector1} Predictions</h4>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                  {results.predictions.sector1.slice(0, 5).join('\n')}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-1">{formData.sector2} Predictions</h4>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                  {results.predictions.sector2.slice(0, 5).join('\n')}
                </pre>
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
                  />
                  <Line 
                    type="monotone" 
                    dataKey={formData.sector2} 
                    stroke="#82ca9d" 
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