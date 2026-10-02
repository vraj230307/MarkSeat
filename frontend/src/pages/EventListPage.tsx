import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { EventItem } from '../types';
import { api } from '../api/client';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Calendar, MapPin, Clock, Search, ShieldCheck } from 'lucide-react';

import { mapApiError } from '../api/errorHandler';

export const EventListPage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fetchEvents = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err: unknown) {
      const mapped = mapApiError(err, 'Unable to fetch upcoming events.');
      setError(mapped.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const categories = ['All', ...Array.from(new Set(events.map(e => e.category)))];

  const filteredEvents = events.filter(e => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <MetaTags
        title="Verified Events"
        description="Browse available tickets with fair queue allocation and cryptographic identity locks."
        canonicalPath="/events"
      />

      {/* Header section: plain, concrete copy */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b0519] tracking-tight">
          Current Events and Performances
        </h1>
        <p className="mt-2 text-sm text-[#524b64]">
          Verified inventory protected by randomized queues and atomic hold timers.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#766f88] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            id="event-search"
            placeholder="Search by event title, venue, or city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#cbbfef] rounded-[6px] text-[#0b0519] placeholder-[#766f88] focus:outline-none focus:ring-1 focus:ring-[#5c34d7]"
            aria-label="Search events"
          />
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#524b64] whitespace-nowrap">
            Category:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#5c34d7] text-white border border-[#5c34d7]'
                  : 'bg-white text-[#0b0519] border border-[#cbbfef] hover:bg-[#f4f1fc]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content states */}
      {isLoading ? (
        <LoadingState message="Retrieving event listings from verified server..." />
      ) : error ? (
        <ErrorState
          title="Could not load events"
          message={error}
          onRetry={fetchEvents}
        />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No events match your criteria"
          description="Try clearing your search query or switching categories to see other scheduled performances."
          actionText="Clear Search"
          onAction={() => {
            setSearchQuery('');
            setSelectedCategory('All');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            const isSoldOut = event.status === 'sold_out';
            const isUpcoming = event.status === 'upcoming';

            return (
              <Card
                key={event.id}
                className="flex flex-col justify-between hover:border-[#5c34d7] transition-colors duration-150"
              >
                <div>
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-[6px] bg-[#f4f1fc] text-[#5c34d7] border border-[#cbbfef]">
                      {event.category}
                    </span>

                    {/* Status badge: dark text on secondary/accent, white on primary */}
                    {isSoldOut ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#e1658b] text-[#0b0519] border border-[#ce557a]">
                        Sold Out
                      </span>
                    ) : isUpcoming ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#e98dc5] text-[#0b0519] border border-[#d47cb0]">
                        Upcoming
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-[6px] bg-[#5c34d7] text-white">
                        On Sale
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-bold text-[#0b0519] mb-3 leading-snug">
                    {event.title}
                  </h2>

                  {/* Metadata fields */}
                  <div className="space-y-2 text-xs text-[#524b64] mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                      <span>{event.time} (Doors open: {event.doorsOpenTime})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                      <span>{event.venue}, {event.city}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#0b0519] leading-relaxed mb-4 line-clamp-2">
                    {event.description}
                  </p>
                </div>

                {/* Footer and Action */}
                <div className="pt-4 border-t border-[#dfd8f5] flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                      Price Range
                    </span>
                    <span className="text-sm font-bold font-mono text-[#0b0519]">
                      ${event.priceMin} to ${event.priceMax}
                    </span>
                  </div>

                  {isSoldOut ? (
                    <Button variant="outline" size="sm" disabled>
                      Sold Out
                    </Button>
                  ) : (
                    <Link to={`/events/${event.id}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={event.requiresQueue ? <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> : undefined}
                      >
                        {event.requiresQueue ? 'Enter Queue' : 'Select Seats'}
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
