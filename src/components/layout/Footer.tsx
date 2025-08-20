import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between h-16 text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>© 2024 AI Todo. All rights reserved.</span>
          </div>
          
          <div className="flex items-center space-x-6 mt-2 sm:mt-0">
            <button 
              className="hover:text-primary-600 transition-colors duration-200"
              onClick={() => console.log('プライバシーポリシー')}
            >
              プライバシーポリシー
            </button>
            <button 
              className="hover:text-primary-600 transition-colors duration-200"
              onClick={() => console.log('利用規約')}
            >
              利用規約
            </button>
            <button 
              className="hover:text-primary-600 transition-colors duration-200"
              onClick={() => console.log('ヘルプ')}
            >
              ヘルプ
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;