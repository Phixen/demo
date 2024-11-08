import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../componets/ui/card';
import { Input } from '../../componets/ui/input';
import { Button } from '../../componets/ui/button';
import { Alert, AlertDescription } from '../../componets/ui/alert';
import { Loader2, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MathAnalysisResults } from '../types';

const SECTOR_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', 
  '#ff8042', '#0088fe', '#ff6b6b'
];

const MathAnalysis: React.FC = () => {
  const [sectors, setSectors] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MathAnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSectorChange = (index: number, value: string) => {
    const newSectors = [...sectors];
    newSectors[index] = value;
    setSectors(newSectors);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/math', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sectors }),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5" />
          Mathematical Analysis Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sectors.map((sector, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: SECTOR_COLORS[index] }}
              />
              <Input
                placeholder={`Sector ${index + 1}`}
                value={sector}
                onChange={(e) => handleSectorChange(index, e.target.value)}
                className="flex-1"
              />
            </div>
          ))}
        </div>

        <Button 
          onClick={handleSubmit}
          disabled={loading || sectors.some(s => !s)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Processing...
            </>
          ) : (
            'Analyze Sectors'
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="h-[600px] w-full">
            <ResponsiveContainer>
              <LineChart
                data={results.graphData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp"
                  label={{ value: 'Time Period', position: 'bottom' }}
                />
                <YAxis 
                  label={{ 
                    value: 'Performance Metric', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip />
                <Legend />
                {sectors.map((sector, index) => (
                  sector && (
                    <Line
                      key={sector}
                      type="monotone"
                      dataKey={sector}
                      stroke={SECTOR_COLORS[index]}
                      dot={false}
                      strokeWidth={2}
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MathAnalysis;