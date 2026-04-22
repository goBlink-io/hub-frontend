'use client';

import { useState, useEffect, useCallback } from 'react';

// TODO(security): User profile contains saved wallet addresses — consider migrating to secureStorage
const STORAGE_KEY = 'goblink_profile';
const MAX_ADDRESSES = 20;

export interface SavedAddress {
  label: string;
  address: string;
  chain: string;
  addedAt: number;
}

export interface UserPreferences {
  defaultFromChain?: string;
  defaultToChain?: string;
  showSavingsEstimate: boolean;
  compactMode: boolean;
}

export interface UserProfile {
  nickname?: string;
  savedAddresses: SavedAddress[];
  preferences: UserPreferences;
  createdAt: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  showSavingsEstimate: true,
  compactMode: false,
};

const DEFAULT_PROFILE: UserProfile = {
  savedAddresses: [],
  preferences: DEFAULT_PREFERENCES,
  createdAt: 0,
};

function loadProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      preferences: { ...DEFAULT_PREFERENCES, ...parsed.preferences },
      savedAddresses: Array.isArray(parsed.savedAddresses) ? parsed.savedAddresses : [],
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function saveProfile(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadProfile();
    // Set createdAt on first load
    if (loaded.createdAt === 0) {
      loaded.createdAt = Date.now();
      saveProfile(loaded);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loaded);
     
    setHydrated(true);
  }, []);

  /**
   * Save a named address to the address book.
   */
  const saveAddress = useCallback((label: string, address: string, chain: string) => {
    setProfile(prev => {
      const addresses = [...prev.savedAddresses];

      // Deduplicate by address
      const existingIdx = addresses.findIndex(a => a.address === address);
      if (existingIdx >= 0) {
        addresses[existingIdx] = { ...addresses[existingIdx], label, chain };
      } else {
        if (addresses.length >= MAX_ADDRESSES) {
          // Remove oldest
          addresses.sort((a, b) => a.addedAt - b.addedAt);
          addresses.shift();
        }
        addresses.push({ label, address, chain, addedAt: Date.now() });
      }

      const updated = { ...prev, savedAddresses: addresses };
      saveProfile(updated);
      return updated;
    });
  }, []);

  /**
   * Get all saved addresses, optionally filtered by chain.
   */
  const getAddresses = useCallback(
    (chain?: string): SavedAddress[] => {
      if (!chain) return profile.savedAddresses;
      return profile.savedAddresses.filter(a => a.chain === chain);
    },
    [profile.savedAddresses]
  );

  /**
   * Remove a saved address by address string.
   */
  const removeAddress = useCallback((address: string) => {
    setProfile(prev => {
      const updated = {
        ...prev,
        savedAddresses: prev.savedAddresses.filter(a => a.address !== address),
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  /**
   * Update one or more preference fields.
   */
  const updatePreferences = useCallback((partial: Partial<UserPreferences>) => {
    setProfile(prev => {
      const updated = {
        ...prev,
        preferences: { ...prev.preferences, ...partial },
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  /**
   * Update the user's display nickname.
   */
  const updateNickname = useCallback((nickname: string) => {
    setProfile(prev => {
      const updated = { ...prev, nickname: nickname || undefined };
      saveProfile(updated);
      return updated;
    });
  }, []);

  /**
   * Get the full profile object.
   */
  const getProfile = useCallback((): UserProfile => profile, [profile]);

  return {
    profile,
    hydrated,
    saveAddress,
    getAddresses,
    removeAddress,
    updatePreferences,
    updateNickname,
    getProfile,
  };
}
