'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersonSelector, type PersonLinkType } from '@/components/cherished/PersonSelector';

interface PersonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  linkType: PersonLinkType;
  selectedPeopleIds: string[];
  onSelectionChange: (peopleIds: string[]) => void;
}

/**
 * 소중한 사람 선택 상세 모달
 *
 * 기존 PersonSelector를 래핑
 */
const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  linkType,
  selectedPeopleIds,
  onSelectionChange,
}) => {
  const [mounted, setMounted] = useState(false);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedPeopleIds);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(selectedPeopleIds);
    }
  }, [isOpen, selectedPeopleIds]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = () => {
    onSelectionChange(localSelectedIds);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {description && (
              <p className="text-sm text-base-content/60 mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-4">
          <PersonSelector
            selectedPeopleIds={localSelectedIds}
            onSelectionChange={setLocalSelectedIds}
            linkType={linkType}
            compact={false}
          />
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-base-300">
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-full"
          >
            확인 {localSelectedIds.length > 0 && `(${localSelectedIds.length}명)`}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PersonDetailModal;
