import React from 'react';
import { QueueState } from '../types';
import { ShieldAlert, Users, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

interface QueueModalProps {
  eventTitle: string;
  queueState: QueueState;
  onContinue: () => void;
  onLeaveQueue: () => void;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  eventTitle,
  queueState,
  onContinue,
  onLeaveQueue,
}) => {
  const isReady = queueState.status === 'ready' || (queueState.position !== null && queueState.position <= 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0519]/70 backdrop-blur-xs"
    >
      <div className="bg-white border border-[#dfd8f5] rounded-[8px] p-6 max-w-md w-full shadow-lg text-center">
        {/* Header icon */}
        <div className="w-12 h-12 rounded-[6px] mx-auto mb-4 flex items-center justify-center border border-[#cbbfef] bg-[#f4f1fc] text-[#5c34d7]">
          {isReady ? (
            <CheckCircle2 className="w-6 h-6 text-[#2e7a50]" aria-hidden="true" />
          ) : (
            <Users className="w-6 h-6 text-[#5c34d7]" aria-hidden="true" />
          )}
        </div>

        <h2 id="queue-dialog-title" className="text-lg font-bold text-[#0b0519] mb-1">
          {isReady ? 'Your Turn in Line Has Arrived' : 'Fair Virtual Waiting Room'}
        </h2>
        <p className="text-xs text-[#524b64] mb-5">
          Event: <span className="font-semibold text-[#0b0519]">{eventTitle}</span>
        </p>

        {isReady ? (
          <div className="bg-[#eefaf2] border border-[#2e7a50] rounded-[6px] p-4 mb-6">
            <p className="text-sm font-bold text-[#0b0519] mb-1">
              Access Granted
            </p>
            <p className="text-xs text-[#0b0519]">
              Your randomized spot has reached the front of the queue. Proceed to pick and lock your seats.
            </p>
          </div>
        ) : (
          <div className="bg-[#f4f1fc] border border-[#cbbfef] rounded-[6px] p-5 mb-6 text-center">
            <span className="text-xs uppercase font-semibold tracking-wider text-[#524b64]">
              Current Verified Position
            </span>
            {queueState.position !== null ? (
              <div className="text-4xl font-extrabold font-mono text-[#5c34d7] my-2">
                #{queueState.position}
              </div>
            ) : (
              <div className="text-sm font-semibold text-[#524b64] my-2">
                Assigning queue position...
              </div>
            )}
            <p className="text-[11px] text-[#524b64] leading-relaxed">
              Randomized queue positions are assigned by the server upon sale opening to eliminate bot speed advantage. Keep this window open.
            </p>
          </div>
        )}

        {/* Security callout */}
        <div className="flex items-center gap-2 text-[11px] text-[#524b64] text-left mb-6 bg-[#faf8fe] p-2.5 rounded-[4px] border border-[#e8e2f6]">
          <ShieldAlert className="w-4 h-4 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
          <span>Queue tokens are cryptographically bound to your browser session.</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button variant="outline" size="md" onClick={onLeaveQueue} className="w-full sm:w-auto">
            Leave Waiting Room
          </Button>
          {isReady && (
            <Button variant="primary" size="md" onClick={onContinue} className="w-full sm:w-auto">
              Select Seats
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
