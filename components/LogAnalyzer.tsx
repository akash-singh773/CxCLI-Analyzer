import React, { useState, useCallback } from 'react';
import { parseLogFile } from '../services/logParser';
import { ParsedLogData } from '../types';
import { Dashboard } from './Dashboard';
import { Icons } from './Icons';

export const LogAnalyzer: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedLogData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedLog, setPastedLog] = useState('');

  const processContent = (content: string) => {
    if (!content.trim()) {
      setError("Log content is empty.");
      return;
    }
    
    setLoading(true);
    setError(null);

    // Small delay to allow UI to update loading state
    setTimeout(() => {
      try {
          const data = parseLogFile(content);
          setParsedData(data);
      } catch (e) {
          setError("Failed to parse the log content. Ensure it is a standard Checkmarx CLI log.");
          console.error(e);
      } finally {
          setLoading(false);
      }
    }, 50);
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      processContent(text);
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

  const handlePasteAnalyze = () => {
    processContent(pastedLog);
  };

  const handleReset = () => {
    setParsedData(null);
    setPastedLog('');
    setError(null);
  };

  if (parsedData) {
    return <Dashboard data={parsedData} onReset={handleReset} />;
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in">
       <div className="max-w-4xl w-full text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">CxCLI Log Analyzer</h2>
          <p className="text-gray-500">Parse logs to visualize timeline, API calls, and scan results.</p>
       </div>

       <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel: Drag & Drop */}
          <div 
            className={`
                relative w-full p-10 bg-white rounded-2xl border-2 border-dashed transition-all duration-200
                flex flex-col items-center justify-center space-y-6 shadow-sm min-h-[400px]
                ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400'}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className={`p-5 rounded-full ${loading ? 'bg-gray-100' : 'bg-blue-50 text-blue-600'}`}>
                {loading ? (
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                ) : (
                    <Icons.Upload size={48} />
                )}
            </div>

            <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800">
                    {loading ? 'Processing...' : 'Upload Log File'}
                </h3>
                <p className="text-gray-500 mt-2">Drag & drop your .log or .txt file here</p>
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
                    hover:bg-blue-700 transform transition hover:-translate-y-0.5 cursor-pointer flex items-center
                    ${loading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                `}
            >
                <Icons.Code className="mr-2" size={18} /> Select File
            </label>
          </div>

          {/* Right Panel: Paste Logs */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col min-h-[400px]">
             <div className="flex items-center mb-4 text-gray-800 font-bold text-lg">
                <Icons.Logs className="mr-2 text-blue-600" size={22} />
                <h3>Paste Logs Directly</h3>
             </div>
             <div className="flex-1 relative mb-4 group">
                <textarea
                    className="w-full h-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors placeholder-gray-400"
                    placeholder="Paste raw log content here..."
                    value={pastedLog}
                    onChange={(e) => setPastedLog(e.target.value)}
                    disabled={loading}
                />
             </div>
             <button
                onClick={handlePasteAnalyze}
                disabled={!pastedLog.trim() || loading}
                className={`
                    w-full py-4 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center text-base
                    ${!pastedLog.trim() || loading 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md'}
                `}
             >
                {loading ? 'Processing...' : (
                    <>
                        <Icons.ArrowRight size={18} className="mr-2" /> Analyze Log
                    </>
                )}
             </button>
          </div>
       </div>

       {error && (
         <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 max-w-2xl w-full flex items-start animate-pulse">
            <Icons.Error className="mr-3 mt-0.5 shrink-0" size={20} />
            <div>{error}</div>
         </div>
       )}
    </div>
  );
};