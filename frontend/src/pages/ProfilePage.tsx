import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
import { api } from '../api/client';
import { MetaTags } from '../components/MetaTags';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { StatusBanner } from '../components/StatusBanner';
import { ShieldCheck, User, Mail, Phone, Calendar, Ticket, LogOut } from 'lucide-react';

import { mapApiError } from '../api/errorHandler';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');

  const fetchProfile = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getUserProfile();
      if (!data) {
        navigate('/login?redirect=/profile');
        return;
      }
      setProfile(data);
      setEditName(data.fullName);
      setEditPhone(data.phone);
    } catch (err: unknown) {
      const mapped = mapApiError(err, 'Unable to retrieve user profile.');
      setError(mapped.message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setSuccessNotice(null);
    try {
      const updated = await api.updateUserProfile({
        fullName: editName.trim(),
        phone: editPhone.trim(),
      });
      setProfile(updated);
      await refreshUser();
      setIsEditing(false);
      setSuccessNotice('Profile information updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <LoadingState message="Retrieving account verification record..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <ErrorState
          title="Profile Not Available"
          message={error || 'Could not find an authenticated profile session.'}
          onRetry={fetchProfile}
        />
        <div className="mt-4 text-center">
          <Link to="/login">
            <Button variant="primary" size="sm">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <MetaTags
        title="Account Profile"
        description="View and manage your verified identity and ticketing security credentials."
        canonicalPath="/profile"
      />

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b0519] tracking-tight">
            Account and Identity Profile
          </h1>
          <p className="mt-1 text-sm text-[#524b64]">
            Cryptographic ticket signatures are verified against your registered identity at venue turnstiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/tickets">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Ticket className="w-4 h-4 text-[#5c34d7]" aria-hidden="true" />}
            >
              My Tickets
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            leftIcon={<LogOut className="w-4 h-4 text-[#524b64]" aria-hidden="true" />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {successNotice && (
        <div className="mb-6">
          <StatusBanner type="success" message={successNotice} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Verification Status Card (1 col) */}
        <div className="md:col-span-1">
          <Card className="text-center p-6">
            <div className="w-14 h-14 rounded-[6px] bg-[#f4f1fc] border border-[#cbbfef] flex items-center justify-center text-[#5c34d7] mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-[#5c34d7]" aria-hidden="true" />
            </div>

            <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-[6px] bg-[#5c34d7] text-white mb-2">
              Identity Verified
            </span>

            <h2 className="text-lg font-bold text-[#0b0519]">
              {profile.fullName}
            </h2>
            <p className="text-xs text-[#524b64] mt-1 font-mono">
              ID: {profile.id}
            </p>

            <div className="mt-6 pt-4 border-t border-[#dfd8f5] text-left text-xs space-y-2">
              <div>
                <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                  Verification Method
                </span>
                <span className="font-semibold text-[#0b0519]">
                  {profile.verificationType}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                  Member Since
                </span>
                <span className="text-[#0b0519]">
                  {new Date(profile.registeredAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Details and Edit Form (2 cols) */}
        <div className="md:col-span-2">
          <Card>
            <div className="flex items-center justify-between pb-4 border-b border-[#dfd8f5] mb-6">
              <h2 className="text-base font-bold text-[#0b0519]">
                Personal Information
              </h2>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Details
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <Input
                  id="profile-name"
                  label="Full Legal Name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />

                <Input
                  id="profile-email"
                  label="Email Address"
                  value={profile.email}
                  disabled
                  helperText="Email changes require re-authenticating identity locks."
                />

                <Input
                  id="profile-phone"
                  label="Phone Number"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  required
                />

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="outline" size="md" type="button" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="md" type="submit" isLoading={isSaving}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[#faf8fe] border border-[#e8e2f6]">
                  <User className="w-5 h-5 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                      Full Legal Name
                    </span>
                    <span className="font-semibold text-[#0b0519]">{profile.fullName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[#faf8fe] border border-[#e8e2f6]">
                  <Mail className="w-5 h-5 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                      Account Email
                    </span>
                    <span className="font-semibold text-[#0b0519]">{profile.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[#faf8fe] border border-[#e8e2f6]">
                  <Phone className="w-5 h-5 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                      Phone Number
                    </span>
                    <span className="font-semibold text-[#0b0519]">{profile.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[#faf8fe] border border-[#e8e2f6]">
                  <Calendar className="w-5 h-5 text-[#5c34d7] flex-shrink-0" aria-hidden="true" />
                  <div>
                    <span className="text-[11px] uppercase font-semibold text-[#524b64] block">
                      Registration Timestamp
                    </span>
                    <span className="font-mono text-xs text-[#0b0519]">{profile.registeredAt}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
