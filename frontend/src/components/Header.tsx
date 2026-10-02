import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, Shield, User, LogOut } from 'lucide-react';
import { Button } from './Button';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/events')) return true;
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { label: 'Events', path: '/events' },
    { label: 'My Tickets', path: '/tickets' },
    { label: 'Profile', path: '/profile' },
  ];

  return (
    <header className="w-full bg-white border-b border-[#dfd8f5] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link
          to="/events"
          className="flex items-center gap-2.5 text-[#0b0519] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5c34d7] rounded-[4px]"
          aria-label="Verity Home"
        >
          <div className="w-8 h-8 rounded-[6px] bg-[#5c34d7] flex items-center justify-center text-white flex-shrink-0">
            <Shield className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#0b0519]">
            Verity
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
          {navLinks.map(link => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-[6px] text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5c34d7] ${
                  active
                    ? 'text-[#5c34d7] bg-[#f4f1fc]'
                    : 'text-[#0b0519] hover:text-[#5c34d7] hover:bg-[#f4f1fc]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Auth Controls */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0b0519] bg-[#f4f1fc] border border-[#cbbfef] px-3 py-1.5 rounded-[6px] hover:border-[#5c34d7]"
              >
                <User className="w-3.5 h-3.5 text-[#5c34d7]" aria-hidden="true" />
                <span>{user?.fullName || 'User Profile'}</span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                leftIcon={<LogOut className="w-3.5 h-3.5" aria-hidden="true" />}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-[6px] border border-[#cbbfef] text-[#0b0519] hover:bg-[#f4f1fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5c34d7]"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close main navigation menu' : 'Open main navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#dfd8f5] bg-white px-4 pt-3 pb-5 space-y-2">
          {navLinks.map(link => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-[6px] text-sm font-semibold ${
                  active ? 'text-[#5c34d7] bg-[#f4f1fc]' : 'text-[#0b0519] hover:bg-[#f4f1fc]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-[#dfd8f5] flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0b0519]"
                >
                  <User className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                  <span>{user?.fullName} ({user?.email})</span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full justify-start"
                  leftIcon={<LogOut className="w-4 h-4" aria-hidden="true" />}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
