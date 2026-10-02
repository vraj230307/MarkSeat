import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusBanner } from '../components/StatusBanner';
import { KeyRound, ArrowRight } from 'lucide-react';

export const OtpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const redirectParam = searchParams.get('redirect') || '';
  const navigate = useNavigate();
  const { verifyOtp, setPendingEmail } = useAuth();

  const [otpCode, setOtpCode] = useState<string>('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      setOtpError('Please enter the full 6-digit verification code.');
      return;
    }
    setOtpError(null);
    setIsLoading(true);
    setServerError(null);

    try {
      if (emailParam) {
        setPendingEmail(emailParam);
      }
      await verifyOtp(cleanCode, emailParam);
      navigate(redirectParam || '/profile');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <MetaTags
        title="Verify Code"
        description="Verify your one-time code to authenticate your account session."
        canonicalPath="/verify-otp"
      />

      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-[6px] bg-[#5c34d7] text-white flex items-center justify-center mx-auto mb-3">
          <KeyRound className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#0b0519]">
          Enter Verification Code
        </h1>
        <p className="mt-1 text-xs text-[#524b64]">
          {emailParam ? (
            <>
              Sent to <span className="font-semibold text-[#0b0519]">{emailParam}</span>
            </>
          ) : (
            'Enter the 6-digit code sent to your registered contact.'
          )}
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
            id="otp-code"
            label="6-Digit Verification Code"
            placeholder="123456"
            maxLength={6}
            value={otpCode}
            onChange={e => setOtpCode(e.target.value)}
            error={otpError || undefined}
            helperText="Enter code 123456 for test access."
            className="font-mono text-center tracking-widest text-lg font-bold"
            required
            autoFocus
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          >
            Verify & Continue
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#dfd8f5] flex items-center justify-between text-xs text-[#524b64]">
          <span>Did not receive code?</span>
          <Link to="/login" className="text-[#5c34d7] font-semibold hover:underline">
            Resend or Change Email
          </Link>
        </div>
      </Card>
    </div>
  );
};
