import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { EventItem, Seat, SeatHoldResult, QueueState } from '../types';
import { api } from '../api/client';
import { MetaTags } from '../components/MetaTags';
import { SeatMap } from '../components/SeatMap';
import { QueueModal } from '../components/QueueModal';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';
import { StatusBanner } from '../components/StatusBanner';
import { ArrowLeft, Calendar, MapPin, Clock, ShieldCheck } from 'lucide-react';

import { mapApiError } from '../api/errorHandler';

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [currentHold, setCurrentHold] = useState<SeatHoldResult | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'info' | 'warning' | 'error' | 'success'; message: string } | null>(null);

  // Virtual queue state
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const eventData = await api.getEventById(id);
      if (!eventData) {
        setPageError('Event not found or has been removed from schedule.');
        setIsLoading(false);
        return;
      }
      setEvent(eventData);

      // Check if queue is required
      if (eventData.requiresQueue) {
        const queueRes = await api.joinQueue(id);
        setQueueState(queueRes);
        setShowQueueModal(true);
      }

      const seatsData = await api.getSeats(id);
      setSeats(seatsData);
    } catch (err: unknown) {
      const mapped = mapApiError(err, 'Error loading event and seating layout.');
      setPageError(mapped.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live seat map polling: updates seat states every 2 seconds to show available, held, and sold seats
  // TODO: Switch seat status updates from polling to real-time WebSocket connection when backend gateway is ready.
  useEffect(() => {
    if (!id || isLoading || pageError) return;

    const interval = setInterval(async () => {
      try {
        const updatedSeats = await api.getSeats(id);
        setSeats(updatedSeats);
      } catch {
        // Silent catch for background polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, isLoading, pageError]);

  // Queue polling
  useEffect(() => {
    if (!id || !showQueueModal || !queueState || queueState.status === 'ready') return;

    const queueInterval = setInterval(async () => {
      try {
        const updatedQueue = await api.pollQueue(id);
        setQueueState(updatedQueue);
      } catch {
        // Silent catch
      }
    }, 2500);

    return () => clearInterval(queueInterval);
  }, [id, showQueueModal, queueState]);

  const handleSeatToggle = (seatId: string) => {
    if (currentHold) {
      setBannerNotice({
        type: 'warning',
        message: 'You have an active lock on seats. Complete checkout or wait for expiry before changing seats.',
      });
      return;
    }

    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds(prev => prev.filter(sId => sId !== seatId));
    } else {
      if (selectedSeatIds.length >= 4) {
        setBannerNotice({
          type: 'warning',
          message: 'Maximum limit of 4 seats per customer per transaction to prevent bulk hoarding.',
        });
        return;
      }
      setSelectedSeatIds(prev => [...prev, seatId]);
    }
  };

  const handleHoldSeats = async () => {
    if (!id || selectedSeatIds.length === 0) return;
    setIsHolding(true);
    setBannerNotice(null);

    try {
      const holdResult = await api.holdSeats(id, selectedSeatIds);
      setCurrentHold(holdResult);
      // Immediately navigate to checkout with holdId or prompt user
      navigate(`/checkout?holdId=${holdResult.holdId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to lock seats.';
      setBannerNotice({
        type: 'error',
        message: msg,
      });
      // Refresh seat status to reflect who took the seat
      if (id) {
        const freshSeats = await api.getSeats(id);
        setSeats(freshSeats);
      }
    } finally {
      setIsHolding(false);
    }
  };

  const handleHoldExpired = async () => {
    if (currentHold) {
      await api.releaseHold(currentHold.holdId);
      setCurrentHold(null);
      setSelectedSeatIds([]);
      setBannerNotice({
        type: 'error',
        message: 'Your 5-minute seat hold expired. Seats have been returned to the public pool.',
      });
      if (id) {
        const freshSeats = await api.getSeats(id);
        setSeats(freshSeats);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <LoadingState message="Connecting to atomic seat lock engine and seat inventory..." />
      </div>
    );
  }

  if (pageError || !event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorState
          title="Event Not Available"
          message={pageError || 'The requested event could not be found.'}
          onRetry={loadData}
        />
        <div className="mt-4 text-center">
          <Link to="/events">
            <Button variant="outline" size="sm">
              Return to Events
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <MetaTags
        title={`${event.title} Seating`}
        description={`Live seat map and verified reservation for ${event.title} at ${event.venue}.`}
        canonicalPath={`/events/${event.id}`}
      />

      {/* Queue Modal if applicable */}
      {showQueueModal && queueState && (
        <QueueModal
          eventTitle={event.title}
          queueState={queueState}
          onContinue={() => setShowQueueModal(false)}
          onLeaveQueue={() => {
            setShowQueueModal(false);
            navigate('/events');
          }}
        />
      )}

      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5c34d7] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to All Events</span>
        </Link>
      </div>

      {/* Event Details Overview Header */}
      <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-[6px] bg-[#f4f1fc] text-[#5c34d7] border border-[#cbbfef]">
                {event.category}
              </span>
              {event.requiresQueue && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#e98dc5] text-[#0b0519] border border-[#d47cb0] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  <span>Fair Queue Protection</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b0519]">
              {event.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#524b64]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                <span>{event.time} (Doors: {event.doorsOpenTime})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />
                <span>{event.venue}, {event.city}</span>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-[#dfd8f5] pt-4 md:pt-0 md:pl-6 text-left md:text-right">
            <span className="text-xs uppercase font-semibold text-[#524b64] block">
              Admission Range
            </span>
            <span className="text-xl font-bold font-mono text-[#0b0519]">
              ${event.priceMin} to ${event.priceMax}
            </span>
            <span className="text-[11px] text-[#524b64] block mt-0.5">
              Atomic lock duration: 5 minutes
            </span>
          </div>
        </div>

        {bannerNotice && (
          <div className="mt-4">
            <StatusBanner
              type={bannerNotice.type}
              message={bannerNotice.message}
            />
          </div>
        )}
      </div>

      {/* Seat Map Core Component */}
      <section aria-label="Interactive Seat Selection">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#0b0519]">
            Interactive Seat Selection
          </h2>
          <p className="text-xs text-[#524b64]">
            Select your preferred seats. Seats are locked atomically for 5:00 upon clicking Lock Seats.
          </p>
        </div>

        <SeatMap
          seats={seats}
          selectedSeatIds={selectedSeatIds}
          currentHold={currentHold}
          onSeatToggle={handleSeatToggle}
          onHoldSeats={handleHoldSeats}
          onHoldExpired={handleHoldExpired}
          isHolding={isHolding}
          maxSelection={4}
        />
      </section>
    </div>
  );
};
