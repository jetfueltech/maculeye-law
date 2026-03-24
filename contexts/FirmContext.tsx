import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAllFirms } from '../services/firmService';

export interface Firm {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  created_by: string | null;
  website: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  description: string;
  case_prefix: string | null;
  next_case_number: number;
}

export interface FirmMember {
  id: string;
  firm_id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'member';
  joined_at: string;
  user_profiles?: {
    id: string;
    email: string;
    full_name: string;
    avatar_initials: string;
    system_role: string;
  };
}

interface FirmContextValue {
  firms: Firm[];
  activeFirm: Firm | null;
  activeFirmRole: 'admin' | 'manager' | 'member' | null;
  switchFirm: (firmId: string) => void;
  refreshFirms: () => Promise<void>;
  loading: boolean;
  canViewCombinedAnalytics: boolean;
}

const FirmContext = createContext<FirmContextValue | null>(null);

const ACTIVE_FIRM_KEY = 'legalflow_active_firm_id';

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [activeFirm, setActiveFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFirms = useCallback(async () => {
    const data = await getAllFirms();
    setFirms(data);

    const savedId = localStorage.getItem(ACTIVE_FIRM_KEY);
    const saved = data.find(f => f.id === savedId);
    if (saved) {
      setActiveFirm(saved);
    } else if (data.length > 0) {
      setActiveFirm(data[0]);
      localStorage.setItem(ACTIVE_FIRM_KEY, data[0].id);
    } else {
      setActiveFirm(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadFirms();
  }, [loadFirms]);

  const switchFirm = useCallback((firmId: string) => {
    const firm = firms.find(f => f.id === firmId);
    if (firm) {
      setActiveFirm(firm);
      localStorage.setItem(ACTIVE_FIRM_KEY, firmId);
    }
  }, [firms]);

  const refreshFirms = useCallback(async () => {
    const data = await getAllFirms();
    setFirms(data);

    const savedId = localStorage.getItem(ACTIVE_FIRM_KEY);
    const saved = data.find(f => f.id === savedId);
    if (saved) {
      setActiveFirm(saved);
    } else if (data.length > 0) {
      setActiveFirm(data[0]);
      localStorage.setItem(ACTIVE_FIRM_KEY, data[0].id);
    }
  }, []);

  return (
    <FirmContext.Provider value={{
      firms,
      activeFirm,
      activeFirmRole: 'admin',
      switchFirm,
      refreshFirms,
      loading,
      canViewCombinedAnalytics: true,
    }}>
      {children}
    </FirmContext.Provider>
  );
}

export function useFirm() {
  const ctx = useContext(FirmContext);
  if (!ctx) throw new Error('useFirm must be used within FirmProvider');
  return ctx;
}
