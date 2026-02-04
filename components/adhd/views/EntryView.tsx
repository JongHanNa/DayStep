'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import ADHDEntryScreen from '../ADHDEntryScreen';

interface EntryViewProps {
  onExit: () => void;
}

export default function EntryView({ onExit }: EntryViewProps) {
  const { user } = useAuth();
  const { goRelationshipInsights, goFuel } = useADHDNavigation();

  return (
    <ADHDEntryScreen
      userId={user?.id}
      onRelationshipInsights={goRelationshipInsights}
      onFuel={goFuel}
    />
  );
}
