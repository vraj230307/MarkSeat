import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { SeatHoldResult, EventItem, CheckoutFormData } from '../types';
import { api } from '../api/client';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Countdown } from '../components/Countdown';
import { LoadingState } from '../components/LoadingState';
import { StatusBanner } from '../components/StatusBanner';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, CreditCard, Building2, Lock, ArrowLeft } from 'lucide-react';

import { mapApiError } from '../api/errorHandler';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const holdId = searchParams.get('holdId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [hold, setHold] = useState<SeatHoldResult | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CheckoutFormData>(() => ({
    attendeeFullName: user?.fullName || '',
    attendeeEmail: user?.email || '',
    governmentIdLast4: '',
    paymentMethod: 'card',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    agreeToTerms: false,
  }));

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadHold() {
      if (!holdId) {
        if (isMounted) setIsLoading(false);
        return;
      }
      try {
        const holdData = await api.getHoldStatus(holdId);
        if (!isMounted) return;
        if (!holdData) {
          setIsExpired(true);
          setIsLoading(false);
          return;
        }
        setHold(holdData);

        const eventData = await api.getEventById(holdData.eventId);
        if (isMounted) setEvent(eventData);
      } catch (err: unknown) {
        if (isMounted) {
          const mapped = mapApiError(err, 'Unable to verify seat hold.');
          setErrorMessage(mapped.message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadHold();
    return () => {
      isMounted = false;
    };
  }, [holdId]);

  const handleHoldExpired = async () => {
    setIsExpired(true);
    if (holdId) {
      await api.releaseHold(holdId);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.attendeeFullName.trim()) {
      errors.attendeeFullName = 'Attendee full name is required for gate identity check.';
    }
    if (!formData.attendeeEmail.trim() || !formData.attendeeEmail.includes('@')) {
      errors.attendeeEmail = 'A valid email address is required.';
    }
    if (!formData.governmentIdLast4.trim() || !/^\d{4}$/.test(formData.governmentIdLast4.trim())) {
      errors.governmentIdLast4 = 'Please enter exactly 4 digits of your government ID or passport.';
    }

    if (formData.paymentMethod === 'card') {
      const cleanCard = formData.cardNumber.replace(/\s+/g, '');
      if (!cleanCard || cleanCard.length < 15 || !/^\d+$/.test(cleanCard)) {
        errors.cardNumber = 'Valid card number is required (15 or 16 digits).';
      }
      if (!formData.cardExpiry.trim() || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.cardExpiry.trim())) {
        errors.cardExpiry = 'Format must be MM/YY (for example: 08/28).';
      }
      if (!formData.cardCvc.trim() || !/^\d{3,4}$/.test(formData.cardCvc.trim())) {
        errors.cardCvc = 'Enter 3 or 4 digit CVC.';
      }
    }

    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the Terms and Conditions and non-transfer policy to proceed.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired || !holdId) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await api.completeCheckout(holdId, formData);
      navigate('/tickets?checkoutSuccess=true');
    } catch (err: unknown) {
      const mapped = mapApiError(err, 'Payment or checkout failed.');
      setErrorMessage(mapped.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <LoadingState message="Verifying atomic hold session and cryptographic booking token..." />
      </div>
    );
  }

  if (!holdId || isExpired || !hold) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <MetaTags
          title="Hold Expired"
          description="Your seat hold session has ended."
          canonicalPath="/checkout"
        />
        <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-8 text-center">
          <div className="w-12 h-12 rounded-[6px] bg-[#fae8ee] border border-[#e1658b] flex items-center justify-center text-[#c23d66] mx-auto mb-4">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-[#0b0519] mb-2">
            Seat Hold Expired or Invalid
          </h1>
          <p className="text-xs text-[#524b64] max-w-md mx-auto mb-6">
            The 5-minute atomic lock window has elapsed. Held seats are automatically returned to the public pool to prevent bot monopolization.
          </p>
          <Link to="/events">
            <Button variant="primary" size="md">
              Return to Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <MetaTags
        title="Checkout Reservation"
        description="Finalize your identity-locked tickets before hold timer expiry."
        canonicalPath="/checkout"
      />

      <div className="mb-6">
        <Link
          to={`/events/${hold.eventId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c34d7] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Change Seats</span>
        </Link>
      </div>

      {/* Prominent 5-minute Hold Timer Banner */}
      <div className="bg-[#ece7fb] border-2 border-[#5c34d7] rounded-[8px] p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#5c34d7] block">
            Atomic Seat Lock Active
          </span>
          <p className="text-sm font-bold text-[#0b0519]">
            Complete reservation before the hold timer expires to secure these seats.
          </p>
        </div>
        <Countdown
          targetTimestamp={hold.expiresAt}
          label="Lock expires in"
          expiredMessage="Seat released"
          onExpire={handleHoldExpired}
        />
      </div>

      {errorMessage && (
        <div className="mb-6">
          <StatusBanner type="error" message={errorMessage} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Checkout Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card>
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#0b0519] mb-1">
                  Attendee Identity Verification
                </h2>
                <p className="text-xs text-[#524b64]">
                  Tickets are cryptographically bound to the attendee name and ID. Tickets cannot be resold or transferred to secondary markets.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  id="checkout-name"
                  label="Attendee Full Legal Name"
                  placeholder="As printed on government ID"
                  value={formData.attendeeFullName}
                  onChange={e => setFormData({ ...formData, attendeeFullName: e.target.value })}
                  error={formErrors.attendeeFullName}
                  required
                />

                <Input
                  id="checkout-email"
                  type="email"
                  label="Delivery Email Address"
                  placeholder="name@example.com"
                  value={formData.attendeeEmail}
                  onChange={e => setFormData({ ...formData, attendeeEmail: e.target.value })}
                  error={formErrors.attendeeEmail}
                  helperText="Rotating cryptographic tickets will be delivered to this account."
                  required
                />

                <Input
                  id="checkout-id-last4"
                  label="Government ID Last 4 Digits"
                  placeholder="4 digits (e.g. 8901)"
                  maxLength={4}
                  value={formData.governmentIdLast4}
                  onChange={e => setFormData({ ...formData, governmentIdLast4: e.target.value })}
                  error={formErrors.governmentIdLast4}
                  helperText="Required by gate security to verify ticket freshness and authenticity at turnstiles."
                  required
                />
              </div>

              <div className="pt-4 border-t border-[#dfd8f5]">
                <h2 className="text-lg font-bold text-[#0b0519] mb-3">
                  Payment Method
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                    className={`p-3 rounded-[6px] border text-left flex items-center gap-2.5 transition-colors duration-150 ${
                      formData.paymentMethod === 'card'
                        ? 'border-[#5c34d7] bg-[#f4f1fc] text-[#0b0519]'
                        : 'border-[#cbbfef] bg-white text-[#524b64] hover:bg-[#faf8fe]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                    <span className="text-xs font-bold">Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'instant_bank' })}
                    className={`p-3 rounded-[6px] border text-left flex items-center gap-2.5 transition-colors duration-150 ${
                      formData.paymentMethod === 'instant_bank'
                        ? 'border-[#5c34d7] bg-[#f4f1fc] text-[#0b0519]'
                        : 'border-[#cbbfef] bg-white text-[#524b64] hover:bg-[#faf8fe]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                    <span className="text-xs font-bold">Verified Bank Transfer</span>
                  </button>
                </div>

                {formData.paymentMethod === 'card' ? (
                  <div className="space-y-4">
                    <Input
                      id="card-number"
                      label="Card Number"
                      placeholder="4000 1234 5678 9010"
                      value={formData.cardNumber}
                      onChange={e => setFormData({ ...formData, cardNumber: e.target.value })}
                      error={formErrors.cardNumber}
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        id="card-expiry"
                        label="Expiration (MM/YY)"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={formData.cardExpiry}
                        onChange={e => setFormData({ ...formData, cardExpiry: e.target.value })}
                        error={formErrors.cardExpiry}
                        required
                      />

                      <Input
                        id="card-cvc"
                        label="Security Code (CVC)"
                        placeholder="CVC"
                        maxLength={4}
                        value={formData.cardCvc}
                        onChange={e => setFormData({ ...formData, cardCvc: e.target.value })}
                        error={formErrors.cardCvc}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-[6px] bg-[#f4f1fc] border border-[#cbbfef] text-xs text-[#0b0519]">
                    Instant routing via verified banking token. Your bank account will be authenticated directly upon clicking Complete Booking.
                  </div>
                )}
              </div>

              {/* Legal Terms consent */}
              <div className="pt-4 border-t border-[#dfd8f5]">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="checkout-agree-terms"
                    checked={formData.agreeToTerms}
                    onChange={e => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                    className="mt-1 w-4 h-4 text-[#5c34d7] rounded-[4px] border-[#cbbfef] focus:ring-[#5c34d7]"
                  />
                  <label htmlFor="checkout-agree-terms" className="text-xs text-[#524b64] leading-relaxed">
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" className="text-[#5c34d7] underline font-semibold">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" className="text-[#5c34d7] underline font-semibold">
                      Privacy Policy
                    </Link>
                    . I understand that tickets cannot be scalped, resold, or transferred outside verified gate validation.
                  </label>
                </div>
                {formErrors.agreeToTerms && (
                  <p className="mt-1.5 text-xs text-[#c02a54] font-medium" role="alert">
                    {formErrors.agreeToTerms}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={isExpired}
                className="w-full"
              >
                Complete Booking (${hold.totalAmount})
              </Button>
            </form>
          </Card>
        </div>

        {/* Order Summary (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="sticky top-20">
            <h2 className="text-base font-bold text-[#0b0519] pb-3 border-b border-[#dfd8f5]">
              Order Reservation Summary
            </h2>

            {event && (
              <div className="py-4 border-b border-[#dfd8f5]">
                <h3 className="text-sm font-bold text-[#0b0519]">{event.title}</h3>
                <p className="text-xs text-[#524b64] mt-1">{event.venue}, {event.city}</p>
                <p className="text-xs text-[#524b64]">{event.date} at {event.time}</p>
              </div>
            )}

            <div className="py-4 border-b border-[#dfd8f5] space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#524b64] block">
                Held Reserved Seats ({hold.seats.length})
              </span>
              {hold.seats.map(seat => (
                <div key={seat.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[#0b0519]">
                      Row {seat.row}, Seat {seat.number}
                    </span>
                    <span className="text-[#524b64] block text-[11px]">
                      {seat.section}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#0b0519]">
                    ${seat.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-[#524b64]">
                <span>Ticket Subtotal</span>
                <span className="font-mono text-[#0b0519]">${hold.totalAmount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#524b64]">
                <span>Platform Security & Anti-Bot Service</span>
                <span className="font-mono text-[#0b0519]">$0.00</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-[#0b0519] pt-2 border-t border-[#dfd8f5]">
                <span>Total Due</span>
                <span className="font-mono text-[#5c34d7]">${hold.totalAmount}</span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-[#faf8fe] border border-[#e7e1f7] rounded-[6px] flex items-center gap-2.5 text-[11px] text-[#524b64]">
              <ShieldCheck className="w-4 h-4 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
              <span>Identity-locked passes are signed with tamper-evident hash verification.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
