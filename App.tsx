import React, { useState } from 'react';
import { Icons } from './components/Icons';
import { LogAnalyzer } from './components/LogAnalyzer';
import { JwtDecoder } from './components/JwtDecoder';
import { ErrorAnalyzer } from './components/ErrorAnalyzer';
import { RoleFinder } from './components/RoleFinder';

type ActiveTool = 'logs' | 'jwt' | 'errors' | 'roles';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ActiveTool>('logs');

  const renderContent = () => {
    switch (activeTool) {
        case 'logs': return <LogAnalyzer />;
        case 'jwt': return <JwtDecoder />;
        case 'errors': return <ErrorAnalyzer />;
        case 'roles': return <RoleFinder />;
        default: return <LogAnalyzer />;
    }
  };

  const NavItem = ({ id, label, icon: Icon, desc }: { id: ActiveTool, label: string, icon: any, desc: string }) => (
    <button
        onClick={() => setActiveTool(id)}
        className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-start group ${
            activeTool === id 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
            : 'hover:bg-white hover:shadow-md text-gray-600'
        }`}
    >
        <div className={`p-2 rounded-lg mr-3 shrink-0 ${
            activeTool === id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'
        }`}>
            <Icon size={20} />
        </div>
        <div>
            <div className={`font-bold ${activeTool === id ? 'text-white' : 'text-gray-800'}`}>{label}</div>
            <div className={`text-xs mt-1 ${activeTool === id ? 'text-blue-100' : 'text-gray-400'}`}>{desc}</div>
        </div>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                    <img 
                        src="https://techno-fin.com/wp-content/uploads/2025/10/12397690.png" 
                        className="w-10 h-10 rounded-lg shadow-lg object-contain"
                        alt="Checkmarx Logo"
                    />
                    <div>
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">Checkmarx</h1>
                        <h1 className="text-lg font-light text-blue-600 tracking-wide leading-none">Rezolv</h1>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 ml-1">Support Engineer Toolkit v2.0</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mb-2 mt-2">Tools</div>
                <NavItem 
                    id="logs" 
                    label="CxCLI Log Analyzer" 
                    icon={Icons.Logs} 
                    desc="Parse & visualize CLI logs"
                />
                <NavItem 
                    id="jwt" 
                    label="JWT Decoder" 
                    icon={Icons.Key} 
                    desc="Inspect token payload"
                />
                <NavItem 
                    id="errors" 
                    label="Error Analyzer" 
                    icon={Icons.Search} 
                    desc="Lookup status codes"
                />
                
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mb-2 mt-6">Beta</div>
                <NavItem 
                    id="roles" 
                    label="Role Finder" 
                    icon={Icons.Users} 
                    desc="Analyze IAM permissions"
                />
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-xs text-gray-400">
                &copy; 2025 Checkmarx Rezolv
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden">
            {renderContent()}
        </main>
    </div>
  );
};

export default App;