import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { StatusBanner } from '../components/StatusBanner';
import { Shield, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    agreeToTerms: false,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full legal name is required for ticket identification.';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errors.email = 'A valid email address is required.';
    }
    if (!formData.phone.trim() || formData.phone.length < 7) {
      errors.phone = 'Phone number is required for SMS or multi-factor authentication.';
    }
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the Terms and Conditions and Privacy Policy.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      });
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email.trim())}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your details.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <MetaTags
        title="Register Verified Account"
        description="Create an account protected by anti-bot verification and identity locking."
        canonicalPath="/register"
      />

      <div className="text-center mb-6">
        <div className="w-10 h-10 rounded-[6px] bg-[#5c34d7] text-white flex items-center justify-center mx-auto mb-3">
          <Shield className="w-5 h-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-[#0b0519]">
          Create Verified Account
        </h1>
        <p className="mt-1 text-xs text-[#524b64]">
          Identity-bound ticketing prevents scalpers and bot account farms.
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
            id="register-fullname"
            label="Full Legal Name"
            placeholder="First and last name"
            value={formData.fullName}
            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            error={formErrors.fullName}
            required
          />

          <Input
            id="register-email"
            type="email"
            label="Email Address"
            placeholder="name@example.com"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            required
          />

          <Input
            id="register-phone"
            type="tel"
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            error={formErrors.phone}
            helperText="Used strictly for secondary security verification codes."
            required
          />

          {/* Mandatory Consent Checkbox */}
          <div className="pt-2">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="register-consent"
                checked={formData.agreeToTerms}
                onChange={e => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                className="mt-1 w-4 h-4 text-[#5c34d7] rounded-[4px] border-[#cbbfef] focus:ring-[#5c34d7]"
              />
              <label htmlFor="register-consent" className="text-xs text-[#524b64] leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="text-[#5c34d7] underline font-semibold">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" target="_blank" className="text-[#5c34d7] underline font-semibold">
                  Privacy Policy
                </Link>
                . I acknowledge that automated behavior signals and queue telemetry may be processed to verify human presence.
              </label>
            </div>
            {formErrors.agreeToTerms && (
              <p className="mt-1 text-xs text-[#c02a54] font-medium" role="alert">
                {formErrors.agreeToTerms}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
          >
            Create Account & Send Code
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#dfd8f5] text-center text-xs text-[#524b64]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#5c34d7] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};
