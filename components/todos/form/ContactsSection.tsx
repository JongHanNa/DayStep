'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { ContactPicker } from '@/components/contacts/ContactPicker';
import { Contact } from '@/types/contacts';
import { getColorById } from '@/lib/color-palette';

interface ContactsSectionProps {
  selectedContacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  selectedColor?: string;
}

const ContactsSection: React.FC<ContactsSectionProps> = ({
  selectedContacts,
  onContactsChange,
  selectedColor,
}) => {
  // 선택된 색상 정보 가져오기
  const colorData = selectedColor ? getColorById(selectedColor) : null;

  return (
    <div className="mx-4 my-2">
      <div className="flex items-center gap-3 mb-3">
        <Users className="w-5 h-5" style={{ color: colorData?.hex || '#DBAC6C' }} />
        <label className="text-lg font-semibold" style={{ color: '#808080' }}>
          연결된 인물
        </label>
        <span className="text-xs" style={{ color: '#666666' }}>
          (선택사항)
        </span>
      </div>

      <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>

      <ContactPicker
        selectedContacts={selectedContacts}
        onContactsChange={onContactsChange}
        maxContacts={3}
        placeholder="관련 인물을 검색하세요..."
      />

      {selectedContacts.length > 0 && (
        <div className="text-xs mt-2" style={{ color: '#666666' }}>
          💡 연결된 인물들과 관련된 할일로 기록됩니다
        </div>
      )}
      </div>
    </div>
  );
};

export default ContactsSection;