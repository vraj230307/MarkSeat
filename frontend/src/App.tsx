import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EventListPage } from './pages/EventListPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TicketsPage } from './pages/TicketsPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { OtpPage } from './pages/OtpPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { Button } from './components/Button';
import { MetaTags } from './components/MetaTags';

const NotFoundPage: React.FC = () => (
  <div className="max-w-xl mx-auto px-4 py-20 text-center">
    <MetaTags
      title="Page Not Found"
      description="The requested page could not be located."
      canonicalPath="/404"
    />
    <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-8">
      <h1 className="text-3xl font-extrabold text-[#0b0519] mb-2">404</h1>
      <h2 className="text-base font-bold text-[#0b0519] mb-2">Page Not Found</h2>
      <p className="text-xs text-[#524b64] mb-6">
        The route or ticket destination you followed does not exist.
      </p>
      <Link to="/events">
        <Button variant="primary" size="md">
          Return to Events
        </Button>
      </Link>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#f4f1fc] text-[#0b0519] antialiased">
          <Header />
          <main className="flex-1 w-full" id="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route path="/events" element={<EventListPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify-otp" element={<OtpPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
