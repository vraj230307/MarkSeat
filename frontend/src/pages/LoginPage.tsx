import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusBanner } from '../components/StatusBanner';
import { Lock, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';
  const { login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid account email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      await login(email.trim());
      const redirectQuery = redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}${redirectQuery}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check the email address.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <MetaTags
        title="Sign In"
        description="Sign in securely using cryptographic one-time password verification."
        canonicalPath="/login"
      />

      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-[6px] bg-[#5c34d7] text-white flex items-center justify-center mx-auto mb-3">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#0b0519]">
          Sign In to Verity
        </h1>
        <p className="mt-1 text-xs text-[#524b64]">
          Passwordless login via one-time verification code sent to your email.
        </p>
      </div>

      {serverError && (
        <div className="mb-4">
          <StatusBanner type="error" message={serverError} />
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="login-email"
            type="email"
            label="Registered Email Address"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            error={emailError || undefined}
            helperText="We will send a 6-digit verification code to this address."
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          >
            Send Verification Code
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#dfd8f5] text-center text-xs text-[#524b64]">
          Do not have an account?{' '}
          <Link to="/register" className="text-[#5c34d7] font-semibold hover:underline">
            Register Account
          </Link>
        </div>
      </Card>
    </div>
  );
};
