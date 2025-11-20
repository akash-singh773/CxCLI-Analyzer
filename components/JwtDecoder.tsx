import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

export const JwtDecoder: React.FC = () => {
  const [token, setToken] = useState('');
  const [header, setHeader] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const decodeBase64 = (str: string) => {
    try {
        // Replace non-url compatible chars
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        // Decode
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        throw new Error("Invalid Base64 string");
    }
  };

  useEffect(() => {
    if (!token.trim()) {
        setHeader(null);
        setPayload(null);
        setError(null);
        return;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        setError("Invalid Token Format: JWT must have 3 parts (Header.Payload.Signature)");
        setHeader(null);
        setPayload(null);
        return;
    }

    try {
        const decodedHeader = decodeBase64(parts[0]);
        const decodedPayload = decodeBase64(parts[1]);
        setHeader(decodedHeader);
        setPayload(decodedPayload);
        setError(null);
    } catch (e) {
        setError("Failed to decode token. Ensure it is a valid JWT.");
    }

  }, [token]);

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full">
        <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">JWT Token Decoder</h2>
            <p className="text-gray-500">Paste a JWT token to inspect its header and payload securely offline.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
            {/* Input Side */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col">
                 <div className="flex items-center mb-4 font-semibold text-gray-700">
                    <Icons.Key className="mr-2 text-purple-600" size={20} />
                    Encoded Token
                 </div>
                 <textarea 
                    className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                 />
            </div>

            {/* Output Side */}
            <div className="flex flex-col space-y-4 overflow-hidden">
                 {/* Header */}
                 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-1 flex flex-col min-h-0">
                    <div className="flex items-center mb-2 font-semibold text-gray-700">
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded mr-2">HEADER</span>
                        <span className="text-xs text-gray-400">Algorithm & Token Type</span>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-auto border border-gray-100">
                        {header ? (
                            <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                                {JSON.stringify(header, null, 2)}
                            </pre>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">Waiting for input...</div>
                        )}
                    </div>
                 </div>

                 {/* Payload */}
                 <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex-[2] flex flex-col min-h-0">
                    <div className="flex items-center mb-2 font-semibold text-gray-700">
                        <span className="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded mr-2">PAYLOAD</span>
                        <span className="text-xs text-gray-400">Data Claims</span>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 overflow-auto border border-gray-100 relative">
                        {payload ? (
                            <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                                {JSON.stringify(payload, null, 2)}
                            </pre>
                        ) : (
                             <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">Waiting for input...</div>
                        )}
                    </div>
                 </div>
            </div>
        </div>

        {error && (
             <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center">
                <Icons.Error className="mr-2" size={20} />
                {error}
             </div>
        )}
    </div>
  );
};