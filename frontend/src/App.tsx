// src/App.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../componets/ui/tabs"
import { TrendingUp, BarChart2 } from 'lucide-react'
import MLAnalysis from './components/MLAnalysis'
import MathAnalysis from './components/MathAnalysis'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Sector Analysis Platform</h1>
        
        <Tabs defaultValue="ml" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ml" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ML Analysis
            </TabsTrigger>
            <TabsTrigger value="math" className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Math Analysis
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="ml">
            <MLAnalysis />
          </TabsContent>
          
          <TabsContent value="math">
            <MathAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App