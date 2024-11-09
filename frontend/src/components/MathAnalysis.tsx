import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../componets/ui/card';
import { Button } from '../../componets/ui/button';
import { Alert, AlertDescription } from '../../componets/ui/alert';
import { Loader2, Upload, TrendingUp } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define types for the portfolio data
// Define types for the portfolio data
interface PortfolioPoint {
  volatility: number;
  return: number;
  weights: number[];
}

interface PortfolioData {
  volatility: number;
  return: number;
  weights: number[];
}

interface OptimizationResults {
  efficient_frontier: PortfolioPoint[];
  minimum_volatility_portfolio: PortfolioData;
  maximum_return_portfolio: PortfolioData;
  tradeoff_portfolio: PortfolioData;
}

const MathAnlysis: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alpha, setAlpha] = useState<number>(0.5);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length < 2 || selectedFiles.length > 6) {
      setError('Please select between 2 and 6 CSV files');
      return;
    }
    setFiles(selectedFiles);
    setError(null);
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);  // Changed from file1, file2 to 'files' for multiple files
      });
      formData.append('alpha', alpha.toString());

      const response = await fetch('http://127.0.0.1:5000/efficient_frontier', {
        method: 'POST',
        body: formData,
        // Add CORS headers if needed
        credentials: 'omit',  // Add this if you're getting CORS issues
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API call failed: ${errorData}`);
      }

      const data: OptimizationResults = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Error details:', err);  // Add detailed logging
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTooltipValue = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Optimization Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Upload 2-6 CSV files with price data
                </span>
                <span className="text-xs text-gray-400">
                  {files.length ? `${files.length} files selected` : 'No files selected'}
                </span>
              </label>
            </div>

            {/* Risk-Return Trade-off Slider */}
            <div className="space-y-2">
              <label className="text-sm text-gray-600">
                Risk-Return Trade-off (α): {alpha}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Return Focus</span>
                <span>Risk Focus</span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || files.length < 2}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Optimizing Portfolio...
                </>
              ) : (
                'Generate Efficient Frontier'
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Section */}
          {results && (
            <div className="space-y-6">
              {/* Efficient Frontier Chart */}
              <div className="h-[400px] w-full">
                <ResponsiveContainer>
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis
                      type="number"
                      dataKey="volatility"
                      name="Risk"
                      unit="%"
                      tickFormatter={formatTooltipValue}
                    />
                    <YAxis
                      type="number"
                      dataKey="return"
                      name="Return"
                      unit="%"
                      tickFormatter={formatTooltipValue}
                    />
                    <Tooltip
                      formatter={formatTooltipValue}
                      labelFormatter={(label: number) => `Risk: ${formatTooltipValue(label)}`}
                    />
                    <Legend />
                    <Scatter
                      name="Portfolio Combinations"
                      data={results.efficient_frontier}
                      fill="#8884d8"
                      opacity={0.5}
                    />
                    <Scatter
                      name="Minimum Volatility"
                      data={[results.minimum_volatility_portfolio]}
                      fill="#ff0000"
                      shape="star"
                    />
                    <Scatter
                      name="Maximum Return"
                      data={[results.maximum_return_portfolio]}
                      fill="#00ff00"
                      shape="star"
                    />
                    <Scatter
                      name="Trade-off Portfolio"
                      data={[results.tradeoff_portfolio]}
                      fill="#0000ff"
                      shape="star"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Portfolio Weights Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['minimum_volatility_portfolio', 'maximum_return_portfolio', 'tradeoff_portfolio'] as const).map((portfolioType) => (
                  <Card key={portfolioType}>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {portfolioType.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results[portfolioType].weights.map((weight, index) => (
                          <div key={index} className="flex justify-between">
                            <span>Asset {index + 1}:</span>
                            <span>{weight.toFixed(2)}%</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span>Expected Return:</span>
                            <span>{formatTooltipValue(results[portfolioType].return)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Risk (Volatility):</span>
                            <span>{formatTooltipValue(results[portfolioType].volatility)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MathAnlysis;