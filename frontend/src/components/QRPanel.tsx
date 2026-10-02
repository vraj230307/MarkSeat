import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

interface QRPanelProps {
  ticketId: string;
  initialQrPayload: string; // Provided exclusively by API
  initialExpiresAt: string;
  refreshIntervalSeconds?: number;
  onRefreshRequest: (ticketId: string) => Promise<{
    qrPayload: string;
    expiresAt: string;
    refreshIntervalSeconds: number;
  }>;
  status: 'valid' | 'revoked' | 'used';
}

export const QRPanel: React.FC<QRPanelProps> = ({
  ticketId,
  initialQrPayload,
  initialExpiresAt,
  refreshIntervalSeconds = 30,
  onRefreshRequest,
  status,
}) => {
  const [qrPayload, setQrPayload] = useState<string>(initialQrPayload);
  const [expiresAt, setExpiresAt] = useState<string>(initialExpiresAt);
  const [intervalDuration, setIntervalDuration] = useState<number>(refreshIntervalSeconds);
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, new Date(initialExpiresAt).getTime() - Date.now())
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performRefresh = useCallback(async () => {
    if (status !== 'valid' || isRefreshing) return;
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const freshData = await onRefreshRequest(ticketId);
      setQrPayload(freshData.qrPayload);
      setExpiresAt(freshData.expiresAt);
      setIntervalDuration(freshData.refreshIntervalSeconds || 30);
      setIsStale(false);
    } catch (err: unknown) {
      setIsStale(true);
      const msg = err instanceof Error ? err.message : 'Pass expired, refreshing failed.';
      setErrorMessage(msg);
    } finally {
      setIsRefreshing(false);
    }
  }, [ticketId, onRefreshRequest, status, isRefreshing]);

  useEffect(() => {
    setQrPayload(initialQrPayload);
    setExpiresAt(initialExpiresAt);
  }, [initialQrPayload, initialExpiresAt]);

  useEffect(() => {
    if (status !== 'valid') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const expTime = new Date(expiresAt).getTime();
      const diff = expTime - now;

      if (diff <= 0) {
        setRemainingMs(0);
        setIsStale(true);
        performRefresh();
      } else {
        setRemainingMs(diff);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [expiresAt, status, performRefresh]);

  const totalDurationMs = intervalDuration * 1000;
  const progressRatio = Math.max(0, Math.min(1, remainingMs / totalDurationMs));
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  if (status === 'revoked') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-[#fae8ee] border border-[#e1658b] rounded-[8px] text-center">
        <ShieldAlert className="w-12 h-12 text-[#c23d66] mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-[#0b0519] mb-1">Ticket Revoked</h3>
        <p className="text-xs text-[#0b0519] max-w-xs">
          This pass was flagged or revoked by the integrity engine. Contact support for assistance.
        </p>
      </div>
    );
  }

  if (status === 'used') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-[#f4f1fc] border border-[#cbbfef] rounded-[8px] text-center">
        <ShieldCheck className="w-12 h-12 text-[#5c34d7] mb-3" aria-hidden="true" />
        <h3 className="text-base font-bold text-[#0b0519] mb-1">Ticket Redeemed</h3>
        <p className="text-xs text-[#524b64]">Turnstile verification completed for entry.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-white border border-[#dfd8f5] rounded-[8px] p-5 w-full max-w-[280px] mx-auto text-center">
      {/* Status Header */}
      <div className="flex items-center justify-between w-full mb-3 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-[#5c34d7]">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          <span>Identity-Locked</span>
        </span>
        <span className="font-mono text-[#524b64]">
          {isStale ? 'Expired' : `${remainingSeconds}s`}
        </span>
      </div>

      {/* QR Code Container */}
      <div className="relative w-[210px] h-[210px] bg-white border border-[#cbbfef] rounded-[6px] p-2 flex items-center justify-center overflow-hidden">
        {isStale ? (
          <div className="absolute inset-0 bg-[#fae8ee]/95 p-4 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-[#c23d66] mb-2" aria-hidden="true" />
            <p className="text-xs font-bold text-[#0b0519] mb-1">
              {isRefreshing ? 'Expired, refreshing...' : 'Pass Expired'}
            </p>
            <p className="text-[11px] text-[#0b0519] mb-3 leading-tight">
              {isRefreshing
                ? 'Contacting verification gateway for fresh rotating token...'
                : 'Signature window elapsed. Refresh to generate a fresh entry token.'}
            </p>
            <Button
              variant="accent"
              size="sm"
              onClick={performRefresh}
              isLoading={isRefreshing}
            >
              Refresh Pass
            </Button>
          </div>
        ) : null}

        {/* API-rendered image or SVG data strictly as received */}
        <img
          src={qrPayload}
          alt={`Dynamic entry barcode for ticket ${ticketId}`}
          className="w-full h-full object-contain filter"
          width={194}
          height={194}
        />
      </div>

      {/* Refresh Progress Bar (thin solid bar, flat color) */}
      <div className="w-full mt-3 bg-[#e8e2f6] h-1.5 rounded-[2px] overflow-hidden" role="progressbar" aria-valuenow={Math.round(progressRatio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Pass freshness countdown">
        <div
          className={`h-full transition-all duration-200 ${
            progressRatio < 0.25 ? 'bg-[#e1658b]' : 'bg-[#5c34d7]'
          }`}
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {/* Information text */}
      <div className="mt-3 flex items-center justify-between w-full text-[11px] text-[#524b64]">
        <span>Pass rotates every {intervalDuration}s</span>
        <button
          type="button"
          onClick={performRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1 text-[#5c34d7] hover:underline font-semibold focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#5c34d7] rounded-[2px]"
          aria-label="Manually refresh QR pass"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Sync</span>
        </button>
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs text-[#c02a54] font-medium" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
