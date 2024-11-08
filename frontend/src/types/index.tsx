export interface MLAnalysisData {
    sector1: string;
    sector2: string;
    csvFile1: File | null;
    csvFile2: File | null;
    riskFactor: string;
  }
  
  export interface MLPredictions {
    sector1: string[];
    sector2: string[];
  }
  
  export interface MLResults {
    predictions: MLPredictions;
    graphData: Array<{
      name: string;
      [key: string]: number | string;
    }>;
  }
  
  export interface MathAnalysisResults {
    graphData: Array<{
      timestamp: string;
      [key: string]: number | string;
    }>;
  }