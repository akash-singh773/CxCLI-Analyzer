import React, { useState, useCallback } from 'react';
import { parseLogFile } from './services/logParser';
import { ParsedLogData } from './types';
import { Dashboard } from './components/Dashboard';
import { UploadCloud, FileText } from 'lucide-react';

const App: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedLogData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const text = await file.text();
      // Small delay to allow UI to update loading state for large files
      setTimeout(() => {
        try {
            const data = parseLogFile(text);
            setParsedData(data);
        } catch (e) {
            setError("Failed to parse the log file. Ensure it is a standard Checkmarx CLI log.");
            console.error(e);
        } finally {
            setLoading(false);
        }
      }, 100);
    } catch (err) {
      setError("Error reading file.");
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  if (parsedData) {
    return <Dashboard data={parsedData} onReset={() => setParsedData(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
       <div className="max-w-xl w-full text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2 tracking-tight">CxCLI Log Analyzer</h1>
          <p className="text-gray-500">Analyze your Checkmarx CLI logs offline. Visualize timeline, API calls, and scan results instantly.</p>
       </div>

       <div 
         className={`
            relative w-full max-w-xl p-12 bg-white rounded-2xl border-2 border-dashed transition-all duration-200
            flex flex-col items-center justify-center space-y-6 shadow-sm
            ${isDragging ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300 hover:border-blue-400'}
         `}
         onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
         onDragLeave={() => setIsDragging(false)}
         onDrop={handleDrop}
       >
         <div className="p-4 bg-blue-50 rounded-full text-blue-600">
            {loading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            ) : (
                <UploadCloud size={40} />
            )}
         </div>

         <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-700">
                {loading ? 'Processing Log...' : 'Drag & Drop log file here'}
            </h3>
            <p className="text-sm text-gray-500 mt-2">or click below to browse</p>
         </div>

         <input 
            type="file" 
            accept=".log,.txt" 
            className="hidden" 
            id="file-upload"
            onChange={handleFileInput}
            disabled={loading}
         />
         <label 
            htmlFor="file-upload" 
            className={`
                px-8 py-3 bg-blue-600 text-white rounded-lg font-medium shadow-md 
                hover:bg-blue-700 transform transition hover:-translate-y-0.5 cursor-pointer
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
         >
            Select File
         </label>
       </div>

       {error && (
         <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 max-w-xl w-full flex items-center">
            <FileText className="mr-2" size={20} />
            {error}
         </div>
       )}

       <div className="mt-12 grid grid-cols-3 gap-4 text-center text-gray-400 text-xs max-w-lg">
          <div>
             <strong className="block text-gray-600 text-sm mb-1">Offline</strong>
             Run locally in your browser
          </div>
          <div>
             <strong className="block text-gray-600 text-sm mb-1">Secure</strong>
             No data leaves your machine
          </div>
          <div>
             <strong className="block text-gray-600 text-sm mb-1">Fast</strong>
             Instant parsing & analysis
          </div>
       </div>
    </div>
  );
};

export default App;