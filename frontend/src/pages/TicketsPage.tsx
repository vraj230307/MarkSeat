import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Ticket } from '../types';
import { api } from '../api/client';
import { MetaTags } from '../components/MetaTags';
import { QRPanel } from '../components/QRPanel';
import { Card } from '../components/Card';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { StatusBanner } from '../components/StatusBanner';
import { Calendar, MapPin, Clock, ShieldCheck, Ticket as TicketIcon } from 'lucide-react';

import { mapApiError } from '../api/errorHandler';

export const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutSuccess = searchParams.get('checkoutSuccess') === 'true';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setError(null);
    try {
      const profile = await api.getUserProfile();
      if (!profile) {
        navigate('/login?redirect=/tickets');
        return;
      }
      const data = await api.getTickets();
      setTickets(data);
    } catch (err: unknown) {
      const mapped = mapApiError(err, 'Failed to retrieve your tickets.');
      setError(mapped.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleRefreshTicketQR = async (ticketId: string) => {
    const res = await api.refreshTicketQR(ticketId);
    // Update local ticket instance
    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? {
              ...t,
              qrPayload: res.qrPayload,
              issuedAt: res.issuedAt,
              expiresAt: res.expiresAt,
              refreshIntervalSeconds: res.refreshIntervalSeconds,
            }
          : t
      )
    );
    return res;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <MetaTags
        title="My Tickets"
        description="View your active rotating cryptographic entry passes and verified tickets."
        canonicalPath="/tickets"
      />

      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b0519] tracking-tight">
          My Active Tickets
        </h1>
        <p className="mt-2 text-sm text-[#524b64]">
          Entry passes rotate cryptographically every 30 to 60 seconds to prevent resale screenshots and ticket duplication.
        </p>
      </div>

      {checkoutSuccess && (
        <div className="mb-8">
          <StatusBanner
            type="success"
            title="Booking Confirmed and Passes Issued"
            message="Your identity-locked tickets have been minted and cryptographically linked to your account."
          />
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Retrieving your cryptographic passes from the secure gate ledger..." />
      ) : error ? (
        <ErrorState
          title="Could not load tickets"
          message={error}
          onRetry={fetchTickets}
        />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No passes found"
          description="You currently have no active or historical tickets on this account. Browse events to reserve seats."
          actionText="Browse Upcoming Events"
          onAction={() => {
            window.location.href = '/events';
          }}
          icon={<TicketIcon className="w-6 h-6 text-[#5c34d7]" aria-hidden="true" />}
        />
      ) : (
        <div className="space-y-6">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="p-6 border border-[#dfd8f5] hover:border-[#cbbfef] transition-colors duration-150"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Ticket Details (8 cols) */}
                <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-[#5c34d7] bg-[#f4f1fc] border border-[#cbbfef] px-2.5 py-0.5 rounded-[6px]">
                        {ticket.ticketNumber}
                      </span>
                      {ticket.status === 'valid' ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#5c34d7] text-white">
                          Verified Active
                        </span>
                      ) : ticket.status === 'revoked' ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#e1658b] text-[#0b0519] border border-[#ce557a]">
                          Revoked
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#d8d1e7] text-[#0b0519]">
                          Redeemed
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-[#0b0519]">
                      {ticket.eventTitle}
                    </h2>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#524b64]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                        <span>{ticket.eventDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                        <span>{ticket.eventTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <MapPin className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                        <span>{ticket.venue}, {ticket.city}</span>
                      </div>
                    </div>
                  </div>

                  {/* Seat and Attendee box */}
                  <div className="bg-[#f4f1fc] border border-[#cbbfef] rounded-[6px] p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                        Assigned Seat
                      </span>
                      <span className="font-bold text-sm text-[#0b0519]">
                        Row {ticket.seatRow}, Seat {ticket.seatNumber}
                      </span>
                      <span className="text-[11px] text-[#524b64] block">
                        {ticket.seatSection}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                        Attendee
                      </span>
                      <span className="font-bold text-sm text-[#0b0519]">
                        {ticket.attendeeName}
                      </span>
                      <span className="text-[11px] text-[#524b64] block">
                        Identity Verified
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                        Tamper Hash
                      </span>
                      <span className="font-mono text-[10px] text-[#524b64] block truncate">
                        {ticket.identityHash}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#524b64]">
                    <ShieldCheck className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                    <span>Gate staff scan freshness directly from this screen. Screenshots will be rejected by gate turnstiles.</span>
                  </div>
                </div>

                {/* QR Panel (4 cols) */}
                <div className="lg:col-span-4 flex justify-center">
                  <QRPanel
                    ticketId={ticket.id}
                    initialQrPayload={ticket.qrPayload}
                    initialExpiresAt={ticket.expiresAt}
                    refreshIntervalSeconds={ticket.refreshIntervalSeconds}
                    onRefreshRequest={handleRefreshTicketQR}
                    status={ticket.status}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
