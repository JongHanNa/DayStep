'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Users, X, Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useContacts } from '@/lib/contacts/useContacts';
import { Contact } from '@/types/contacts';

interface ContactPickerProps {
  selectedContacts: Contact[];
  onContactsChange: (contacts: Contact[]) => void;
  maxContacts?: number;
  placeholder?: string;
  className?: string;
}

export function ContactPicker({
  selectedContacts = [],
  onContactsChange,
  maxContacts = 5,
  placeholder = "연결할 인물을 검색하세요...",
  className = "",
}: ContactPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAllContacts, setShowAllContacts] = useState(false);
  
  const { 
    contacts, 
    performSearch, 
    searchResults, 
    clearSearch,
    isAvailable,
    hasPermission,
    syncContacts,
  } = useContacts();

  // 검색 결과 처리
  const displayContacts = useMemo(() => {
    if (!searchTerm.trim()) {
      // 검색어가 없으면 최근 연락처나 자주 사용하는 연락처 우선 표시
      if (showAllContacts) {
        return contacts.slice(0, 20);
      } else {
        // 즐겨찾기나 최근 연락처 우선
        const favoriteContacts = contacts.filter(c => c.tags?.includes('favorite'));
        const recentContacts = contacts
          .filter(c => c.lastContactDate)
          .sort((a, b) => 
            new Date(b.lastContactDate!).getTime() - 
            new Date(a.lastContactDate!).getTime()
          )
          .slice(0, 10);
        
        const combinedContacts = [...favoriteContacts, ...recentContacts]
          .filter((contact, index, self) => 
            self.findIndex(c => c.id === contact.id) === index
          )
          .slice(0, 8);
          
        return combinedContacts.length > 0 ? combinedContacts : contacts.slice(0, 8);
      }
    }
    
    return searchResults.slice(0, 20);
  }, [searchTerm, contacts, searchResults, showAllContacts]);

  // 검색 처리
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch(searchTerm);
        setIsDropdownOpen(true);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch, clearSearch]);

  // 연락처 선택 처리
  const handleSelectContact = (contact: Contact) => {
    if (selectedContacts.find(c => c.id === contact.id)) return;
    
    if (selectedContacts.length >= maxContacts) return;
    
    const updatedContacts = [...selectedContacts, contact];
    onContactsChange(updatedContacts);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  // 연락처 제거 처리
  const handleRemoveContact = (contactId: string) => {
    const updatedContacts = selectedContacts.filter(c => c.id !== contactId);
    onContactsChange(updatedContacts);
  };

  // 동기화 처리 (첫 로그인 시)
  const handleSyncContacts = async () => {
    try {
      await syncContacts(true);
    } catch (error) {
      console.error('Contact sync failed:', error);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 이미 선택된 연락처들 */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <Badge 
              key={contact.id} 
              variant="secondary" 
              className="flex items-center gap-1 px-2 py-1"
            >
              <Users className="w-3 h-3" />
              <span className="text-sm">{contact.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleRemoveContact(contact.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* 검색 입력 필드 */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => {
              // 약간의 지연을 두어 드롭다운 내 클릭 이벤트가 처리될 시간을 확보
              setTimeout(() => setIsDropdownOpen(false), 150);
            }}
            className="pl-10"
            disabled={selectedContacts.length >= maxContacts}
          />
          {selectedContacts.length >= maxContacts && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Badge variant="outline" className="text-xs">
                최대 {maxContacts}명
              </Badge>
            </div>
          )}
        </div>

        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && selectedContacts.length < maxContacts && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
            <CardContent className="p-2">
              {/* 연락처 동기화 안내 (네이티브 환경에서 권한이 없는 경우) */}
              {isAvailable && !hasPermission && (
                <div className="p-4 text-center space-y-3 border-b">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                    <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-1">연락처 연동이 필요해요</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      아이폰 연락처를 연동하면 할일에 쉽게 인물을 연결할 수 있어요
                    </p>
                    <Button size="sm" onClick={handleSyncContacts} className="text-xs">
                      연락처 연동하기
                    </Button>
                  </div>
                </div>
              )}

              {/* 연락처 목록 */}
              {displayContacts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchTerm.trim() 
                    ? `"${searchTerm}"에 대한 검색 결과가 없습니다`
                    : '연락처가 없습니다'
                  }
                </div>
              ) : (
                <>
                  {displayContacts.map((contact) => {
                    const isSelected = selectedContacts.find(c => c.id === contact.id);
                    return (
                      <div
                        key={contact.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                          isSelected ? 'bg-muted' : ''
                        }`}
                        onClick={() => !isSelected && handleSelectContact(contact)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {contact.name}
                              </span>
                              {contact.relationship && (
                                <Badge variant="outline" className="text-xs">
                                  {contact.relationship === 'family' && '가족'}
                                  {contact.relationship === 'friend' && '친구'}
                                  {contact.relationship === 'colleague' && '동료'}
                                  {contact.relationship === 'business' && '비즈니스'}
                                  {contact.relationship === 'other' && '기타'}
                                </Badge>
                              )}
                            </div>
                            {contact.organization?.jobTitle && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {contact.organization.jobTitle}
                              </div>
                            )}
                            {contact.organization?.company && (
                              <div className="text-xs text-muted-foreground">
                                {contact.organization.company}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <Badge variant="default" className="text-xs">
                                선택됨
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* 더 보기 버튼 */}
                  {!searchTerm.trim() && !showAllContacts && contacts.length > 8 && (
                    <div className="p-2 border-t">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllContacts(true)}
                        className="w-full text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        더 많은 연락처 보기 ({contacts.length - 8}명)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 클릭 외부 영역 감지 */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}