import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-[#dfd8f5] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-semibold text-[#0b0519]">
          Verity
        </span>

        <nav className="flex items-center gap-6" aria-label="Legal navigation">
          <Link
            to="/privacy"
            className="text-xs text-[#524b64] hover:text-[#5c34d7] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5c34d7] rounded-[2px]"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms"
            className="text-xs text-[#524b64] hover:text-[#5c34d7] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5c34d7] rounded-[2px]"
          >
            Terms and Conditions
          </Link>
        </nav>
      </div>
    </footer>
  );
};
