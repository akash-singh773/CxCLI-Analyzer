import React from 'react';
import { Icons } from './Icons';

export const RoleFinder: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-orange-50 p-8 rounded-full mb-6">
            <Icons.Users size={64} className="text-orange-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Role Finder</h2>
        <p className="text-gray-500 max-w-md mb-8">
            This feature is currently under development. It will allow you to search and analyze user IAM roles and permissions structure.
        </p>
        <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold border border-orange-200">
            COMING SOON
        </span>
    </div>
  );
};