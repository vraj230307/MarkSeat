import React from 'react';
import { Seat, SeatHoldResult } from '../types';
import { Check, Clock, X, Lock } from 'lucide-react';
import { Button } from './Button';
import { Countdown } from './Countdown';

interface SeatMapProps {
  seats: Seat[];
  selectedSeatIds: string[];
  currentHold: SeatHoldResult | null;
  onSeatToggle: (seatId: string) => void;
  onHoldSeats: () => void;
  onHoldExpired: () => void;
  isHolding: boolean;
  maxSelection?: number;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  currentHold,
  onSeatToggle,
  onHoldSeats,
  onHoldExpired,
  isHolding,
  maxSelection = 4,
}) => {
  // Group seats by section
  const sections = Array.from(new Set(seats.map(s => s.section)));

  const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
  const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Active Hold Banner if current user holds seats */}
      {currentHold && (
        <div className="bg-[#ece7fb] border-2 border-[#5c34d7] rounded-[8px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-[#0b0519]">
                {currentHold.seats.length} Seat{currentHold.seats.length > 1 ? 's' : ''} Locked For You
              </p>
              <p className="text-xs text-[#524b64]">
                Seats: {currentHold.seats.map(s => `${s.row}-${s.number}`).join(', ')} ({currentHold.seats[0].section})
              </p>
            </div>
          </div>
          <Countdown
            targetTimestamp={currentHold.expiresAt}
            label="Lock expires in"
            expiredMessage="Seat released"
            onExpire={onHoldExpired}
          />
        </div>
      )}

      {/* Stage Direction Area */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-xl h-8 bg-[#e8e1f7] border border-[#cbbfef] rounded-[6px] flex items-center justify-center">
          <span className="text-xs font-bold tracking-widest text-[#5c34d7] uppercase">
            Stage / Performance Area
          </span>
        </div>
      </div>

      {/* Map Sections */}
      <div className="space-y-6 overflow-x-auto pb-4">
        {sections.map(sectionName => {
          const sectionSeats = seats.filter(s => s.section === sectionName);
          const rows = Array.from(new Set(sectionSeats.map(s => s.row)));

          return (
            <div
              key={sectionName}
              className="bg-white border border-[#dfd8f5] rounded-[8px] p-4 sm:p-6"
            >
              <div className="flex items-center justify-between mb-4 border-b border-[#e8e2f6] pb-2">
                <h3 className="text-sm font-bold text-[#0b0519]">{sectionName}</h3>
                <span className="text-xs font-semibold text-[#524b64]">
                  ${sectionSeats[0]?.price || 0} per ticket
                </span>
              </div>

              <div className="flex flex-col gap-3 min-w-[320px]">
                {rows.map(rowLetter => {
                  const rowSeats = sectionSeats.filter(s => s.row === rowLetter);

                  return (
                    <div key={rowLetter} className="flex items-center gap-3">
                      {/* Row Label */}
                      <span className="w-6 text-xs font-bold text-[#524b64] text-center select-none">
                        {rowLetter}
                      </span>

                      {/* Seats in Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {rowSeats.map(seat => {
                          const isSelected = selectedSeatIds.includes(seat.id);
                          const isUserHeld = currentHold?.seats.some(s => s.id === seat.id);

                          let seatStateDescription = 'Available';
                          if (seat.status === 'sold') seatStateDescription = 'Sold';
                          else if (isUserHeld) seatStateDescription = 'Held by you';
                          else if (seat.status === 'held') seatStateDescription = 'Held by another buyer';
                          else if (isSelected) seatStateDescription = 'Selected';

                          return (
                            <button
                              key={seat.id}
                              type="button"
                              onClick={() => onSeatToggle(seat.id)}
                              disabled={seat.status === 'sold' || (seat.status === 'held' && !isUserHeld)}
                              aria-label={`Seat Row ${seat.row} Number ${seat.number}, ${sectionName}, $${seat.price}. State: ${seatStateDescription}`}
                              title={`Row ${seat.row}-${seat.number}: $${seat.price} (${seatStateDescription})`}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[6px] border flex flex-col items-center justify-center font-mono text-xs font-semibold transition-colors duration-150 relative ${
                                isSelected
                                  ? 'bg-[#5c34d7] text-white border-[#5c34d7]'
                                  : isUserHeld
                                  ? 'bg-[#e98dc5] text-[#0b0519] border-[#d47cb0]'
                                  : seat.status === 'held'
                                  ? 'bg-[#f4e2ee] text-[#865373] border-[#e2bad4] cursor-not-allowed'
                                  : seat.status === 'sold'
                                  ? 'bg-[#d8d1e7] text-[#6e6782] border-[#cbbfef] cursor-not-allowed opacity-70'
                                  : 'bg-white text-[#0b0519] border-[#cbbfef] hover:border-[#5c34d7] hover:bg-[#f4f1fc] cursor-pointer'
                              }`}
                            >
                              {/* Distinct visual pattern / icon per state */}
                              {isSelected ? (
                                <Check className="w-4 h-4 text-white" aria-hidden="true" />
                              ) : isUserHeld ? (
                                <Lock className="w-3.5 h-3.5 text-[#0b0519]" aria-hidden="true" />
                              ) : seat.status === 'held' ? (
                                <Clock className="w-3.5 h-3.5 text-[#865373]" aria-hidden="true" />
                              ) : seat.status === 'sold' ? (
                                <X className="w-3.5 h-3.5 text-[#6e6782]" aria-hidden="true" />
                              ) : (
                                <span>{seat.number}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend - Clearly differentiates states with Icon, Color, Pattern, and Label */}
      <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#524b64] mb-3">
          Seat Status Legend (Distinguishable by icon, shape, and label)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] border border-[#cbbfef] bg-white text-[#0b0519] flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <span className="font-bold text-[#0b0519]">Available</span>
              <p className="text-[11px] text-[#524b64]">Open for selection</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] border border-[#5c34d7] bg-[#5c34d7] text-white flex items-center justify-center">
              <Check className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-[#0b0519]">Selected</span>
              <p className="text-[11px] text-[#524b64]">Staged for hold</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] border border-[#d47cb0] bg-[#e98dc5] text-[#0b0519] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-[#0b0519]">Temporary Hold</span>
              <p className="text-[11px] text-[#0b0519]">5:00 lock timer</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] border border-[#cbbfef] bg-[#d8d1e7] text-[#6e6782] flex items-center justify-center">
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-[#6e6782]">Sold</span>
              <p className="text-[11px] text-[#6e6782]">Verified occupied</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seat Selection Summary and Hold Lock Bar */}
      <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-sm">
        <div>
          <div className="text-sm font-bold text-[#0b0519]">
            {selectedSeats.length > 0
              ? `${selectedSeats.length} Seat${selectedSeats.length > 1 ? 's' : ''} Selected`
              : 'No seats selected'}
          </div>
          <div className="text-xs text-[#524b64]">
            {selectedSeats.length > 0
              ? `${selectedSeats.map(s => `${s.row}-${s.number}`).join(', ')} | Subtotal: $${subtotal}`
              : `Select up to ${maxSelection} seats to lock for 5 minutes`}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={onHoldSeats}
            disabled={selectedSeats.length === 0 || isHolding || !!currentHold}
            isLoading={isHolding}
            className="w-full sm:w-auto"
          >
            {currentHold ? 'Seats Currently Locked' : 'Lock Seats & Proceed (5 min)'}
          </Button>
        </div>
      </div>
    </div>
  );
};
