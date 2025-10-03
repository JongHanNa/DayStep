'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Edit, Trash2, X, User, Phone, Mail, MapPin, Calendar, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet } from 'react-modal-sheet';
import { animated } from '@react-spring/web';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useElasticScroll } from '@/hooks/useElasticScroll';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/types/contacts';
import { createModalConfig } from '@/lib/modal-config';

interface ContactDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  mode?: 'view' | 'edit' | 'create';
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  open,
  onOpenChange,
  contact,
  mode = 'view'
}) => {
  const [currentMode, setCurrentMode] = useState<'view' | 'edit' | 'create'>(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dragDisabled, setDragDisabled] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const { toast } = useToast();

  // 폼 데이터 상태
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    phoneNumbers: [],
    emails: [],
    addresses: [],
    organization: { company: '', jobTitle: '' },
    relationship: 'other',
    notes: '',
    birthday: ''
  });

  // 탄성 스크롤 효과
  const { containerRef, springs } = useElasticScroll({
    bounceDistance: 80,
    bounceStrength: 1.0,
    bounceDuration: 400,
    desktopOnly: false,
    enabled: open
  });

  // 폼 초기화
  useEffect(() => {
    if (open) {
      if (contact) {
        setFormData({
          ...contact,
          phoneNumbers: contact.phoneNumbers || [],
          emails: contact.emails || [],
          addresses: contact.addresses || [],
          organization: contact.organization || { company: '', jobTitle: '' },
          relationship: contact.relationship || 'other',
          notes: contact.notes || '',
          birthday: contact.birthday || ''
        });
        setCurrentMode(mode);
      } else {
        // 새 연락처 생성 모드
        setFormData({
          name: '',
          phoneNumbers: [],
          emails: [],
          addresses: [],
          organization: { company: '', jobTitle: '' },
          relationship: 'other',
          notes: '',
          birthday: ''
        });
        setCurrentMode('create');
      }
    }
  }, [open, contact, mode]);

  // 스크롤 초기화
  useEffect(() => {
    if (open && containerRef.current) {
      const container = containerRef.current;
      const timer = setTimeout(() => {
        container.scrollTop = 0;
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, containerRef]);

  // 터치 핸들러
  const handleTouchStart = useCallback(() => {
    setDragDisabled(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setDragDisabled(false), 100);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  // 관계 라벨 함수
  const getRelationshipLabel = (relationship?: string) => {
    const labels: { [key: string]: string } = {
      family: '가족',
      friend: '친구',
      colleague: '동료',
      business: '비즈니스',
      other: '기타',
    };
    return labels[relationship || 'other'] || '기타';
  };

  const getRelationshipColor = (relationship?: string) => {
    const colors: { [key: string]: string } = {
      family: 'bg-red-100 text-red-800',
      friend: 'bg-green-100 text-green-800',
      colleague: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[relationship || 'other'] || 'bg-gray-100 text-gray-800';
  };

  // 전화번호 추가
  const addPhoneNumber = () => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: [
        ...(prev.phoneNumbers || []),
        { label: 'mobile', number: '' }
      ]
    }));
  };

  // 전화번호 수정
  const updatePhoneNumber = (index: number, field: 'label' | 'number', value: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers?.map((phone, i) =>
        i === index ? { ...phone, [field]: value } : phone
      ) || []
    }));
  };

  // 전화번호 삭제
  const removePhoneNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers?.filter((_, i) => i !== index) || []
    }));
  };

  // 이메일 추가
  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [
        ...(prev.emails || []),
        { label: 'personal', address: '' }
      ]
    }));
  };

  // 이메일 수정
  const updateEmail = (index: number, field: 'label' | 'address', value: string) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails?.map((email, i) =>
        i === index ? { ...email, [field]: value } : email
      ) || []
    }));
  };

  // 이메일 삭제
  const removeEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emails: prev.emails?.filter((_, i) => i !== index) || []
    }));
  };

  // 주소 추가
  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [
        ...(prev.addresses || []),
        { label: 'home', street: '', city: '', region: '', postalCode: '', country: '' }
      ]
    }));
  };

  // 주소 수정
  const updateAddress = (index: number, field: 'label' | 'street' | 'city' | 'region' | 'postalCode' | 'country', value: string) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses?.map((address, i) =>
        i === index ? { ...address, [field]: value } : address
      ) || []
    }));
  };

  // 주소 삭제
  const removeAddress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses?.filter((_, i) => i !== index) || []
    }));
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: '이름을 입력해주세요',
        description: '연락처 이름은 필수 항목입니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: 실제 저장 로직 구현
      console.log('연락처 저장:', formData);

      toast({
        title: currentMode === 'create' ? '연락처가 생성되었습니다' : '연락처가 수정되었습니다',
        description: currentMode === 'create' ? '새 연락처가 성공적으로 추가되었습니다.' : '연락처 정보가 성공적으로 수정되었습니다.',
      });

      setCurrentMode('view');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: '저장에 실패했습니다',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    if (!contact) return;

    setIsDeleting(true);
    try {
      // TODO: 실제 삭제 로직 구현
      console.log('연락처 삭제:', contact.id);

      toast({
        title: '연락처가 삭제되었습니다',
        description: '선택한 연락처가 성공적으로 삭제되었습니다.',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: '삭제에 실패했습니다',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditMode = currentMode === 'edit' || currentMode === 'create';
  const isCreateMode = currentMode === 'create';

  // 중앙 집중식 모달 설정 - 100% 높이 통일
  const modalConfig = createModalConfig('FULLSCREEN', {
    disableDrag: dragDisabled,
  });

  return (
    <Sheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      {...modalConfig}
    >
      <Sheet.Container>
        <Sheet.Header>
          {/* 드래그 핸들 */}
          <div className="w-full flex justify-center py-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">
                {isCreateMode ? '새 연락처 추가' :
                 currentMode === 'edit' ? '연락처 수정' : '연락처 상세'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode && contact && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMode('edit')}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Sheet.Header>

        {/* 스크롤 컨테이너 */}
        <animated.div
          ref={containerRef}
          className="scrollable-container scrollbar-hide"
          style={{
            height: '80vh',
            maxHeight: '80vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-y',
            padding: '0 0.25rem',
            background: 'var(--background)',
            position: 'relative',
            transform: springs.y.to(y => `translateY(${y}px)`),
          }}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="space-y-6 p-4">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                {isEditMode ? (
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="연락처 이름을 입력하세요"
                  />
                ) : (
                  <div className="text-lg font-medium">{contact?.name}</div>
                )}
              </div>

              {/* 관계 */}
              <div className="space-y-2">
                <Label htmlFor="relationship">관계</Label>
                {isEditMode ? (
                  <Select
                    value={formData.relationship || 'other'}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      relationship: value as 'family' | 'friend' | 'colleague' | 'business' | 'other'
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">가족</SelectItem>
                      <SelectItem value="friend">친구</SelectItem>
                      <SelectItem value="colleague">동료</SelectItem>
                      <SelectItem value="business">비즈니스</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getRelationshipColor(contact?.relationship)}>
                    {getRelationshipLabel(contact?.relationship)}
                  </Badge>
                )}
              </div>

              {/* 회사 정보 */}
              <div className="space-y-2">
                <Label>회사 정보</Label>
                {isEditMode ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="회사명"
                      value={formData.organization?.company || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        organization: { ...prev.organization, company: e.target.value }
                      }))}
                    />
                    <Input
                      placeholder="직책"
                      value={formData.organization?.jobTitle || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        organization: { ...prev.organization, jobTitle: e.target.value }
                      }))}
                    />
                  </div>
                ) : (
                  contact?.organization?.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span>
                        {contact.organization.company}
                        {contact.organization.jobTitle && ` · ${contact.organization.jobTitle}`}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 전화번호 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  전화번호
                </Label>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPhoneNumber}
                  >
                    추가
                  </Button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-2">
                  {formData.phoneNumbers?.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <Select
                        value={phone.label}
                        onValueChange={(value) => updatePhoneNumber(index, 'label', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mobile">휴대폰</SelectItem>
                          <SelectItem value="home">집</SelectItem>
                          <SelectItem value="work">직장</SelectItem>
                          <SelectItem value="other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="전화번호"
                        value={phone.number}
                        onChange={(e) => updatePhoneNumber(index, 'number', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePhoneNumber(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {contact?.phoneNumbers?.map((phone, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground capitalize">{phone.label}:</span>
                      <span className="font-mono">{phone.number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 이메일 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  이메일
                </Label>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmail}
                  >
                    추가
                  </Button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-2">
                  {formData.emails?.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Select
                        value={email.label}
                        onValueChange={(value) => updateEmail(index, 'label', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">개인</SelectItem>
                          <SelectItem value="work">직장</SelectItem>
                          <SelectItem value="other">기타</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="이메일 주소"
                        type="email"
                        value={email.address}
                        onChange={(e) => updateEmail(index, 'address', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeEmail(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {contact?.emails?.map((email, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground capitalize">{email.label}:</span>
                      <span className="text-blue-700">{email.address}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 주소 섹션 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  주소
                </Label>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAddress}
                  >
                    추가
                  </Button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-2">
                  {formData.addresses?.map((address, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded">
                      <div className="flex gap-2">
                        <Select
                          value={address.label}
                          onValueChange={(value) => updateAddress(index, 'label', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home">집</SelectItem>
                            <SelectItem value="work">직장</SelectItem>
                            <SelectItem value="other">기타</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeAddress(index)}
                          className="ml-auto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="도로명 주소"
                        value={address.street || ''}
                        onChange={(e) => updateAddress(index, 'street', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="시/구"
                          value={address.city || ''}
                          onChange={(e) => updateAddress(index, 'city', e.target.value)}
                        />
                        <Input
                          placeholder="구/동"
                          value={address.region || ''}
                          onChange={(e) => updateAddress(index, 'region', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="우편번호"
                          value={address.postalCode || ''}
                          onChange={(e) => updateAddress(index, 'postalCode', e.target.value)}
                        />
                        <Input
                          placeholder="국가"
                          value={address.country || ''}
                          onChange={(e) => updateAddress(index, 'country', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {contact?.addresses?.map((address, index) => (
                    <div key={index} className="space-y-1 p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-muted-foreground capitalize">{address.label}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {[address.street, address.city, address.region, address.postalCode, address.country]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 생일 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                생일
              </Label>
              {isEditMode ? (
                <Input
                  type="date"
                  value={formData.birthday || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                />
              ) : (
                contact?.birthday && (
                  <div className="text-sm">
                    {new Date(contact.birthday).toLocaleDateString('ko-KR')}
                  </div>
                )
              )}
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              {isEditMode ? (
                <Textarea
                  id="notes"
                  placeholder="추가 정보나 메모를 입력하세요"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              ) : (
                contact?.notes && (
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    {contact.notes}
                  </div>
                )
              )}
            </div>

            {/* 하단 여백 */}
            <div style={{ height: 'calc(2rem + env(safe-area-inset-bottom, 20px))' }} />
          </div>
        </animated.div>

        {/* 하단 버튼 영역 */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t px-1 pt-3"
          style={{
            paddingBottom: 'max(4rem, calc(2.5rem + env(safe-area-inset-bottom, 30px)))',
            bottom: 0
          }}
        >
          <div className="flex justify-between items-center w-full gap-2">
            {/* 왼쪽: 삭제 버튼 (수정 모드이고 기존 연락처일 때만) */}
            <div className="flex-shrink-0">
              {currentMode === 'edit' && contact && !isCreateMode && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isDeleting ? '삭제 중...' : '삭제'}
                </Button>
              )}
            </div>

            {/* 오른쪽: 취소, 저장 버튼 */}
            <div className="flex gap-2">
              {isEditMode ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isCreateMode) {
                        onOpenChange(false);
                      } else {
                        setCurrentMode('view');
                      }
                    }}
                    disabled={isSubmitting || isDeleting}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSubmitting || isDeleting || !formData.name?.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting
                      ? (isCreateMode ? '추가 중...' : '수정 중...')
                      : (isCreateMode ? '연락처 추가' : '수정 완료')
                    }
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  닫기
                </Button>
              )}
            </div>
          </div>
        </div>
      </Sheet.Container>
    </Sheet>
  );
};

export default ContactDetailModal;