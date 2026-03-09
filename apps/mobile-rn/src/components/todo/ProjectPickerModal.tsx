/**
 * ProjectPickerModal
 * 프로젝트 선택 전용 모달 (pageSheet 스타일)
 */
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X, Search, Unlink} from 'lucide-react-native';
import {useProjectStore} from '@/stores/projectStore';
import {useAuthStore} from '@/stores/authStore';
import type {Project} from '@/types/project';

interface ProjectPickerModalProps {
  visible: boolean;
  selectedProjectId: string | null;
  onSelect: (projectId: string | null) => void;
  onClose: () => void;
}

export function ProjectPickerModal({
  visible,
  selectedProjectId,
  onSelect,
  onClose,
}: ProjectPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const {projects, fetchProjects} = useProjectStore();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (visible && user) {
      fetchProjects(user.id);
      setSearch('');
    }
  }, [visible, user, fetchProjects]);

  const activeProjects = useMemo(
    () => projects.filter(p => p.status !== 'completed'),
    [projects],
  );

  const selectedProject = useMemo(
    () =>
      selectedProjectId
        ? activeProjects.find(p => p.id === selectedProjectId) ?? null
        : null,
    [selectedProjectId, activeProjects],
  );

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = keyword
      ? activeProjects.filter(p =>
          p.title.toLowerCase().includes(keyword),
        )
      : activeProjects;
    // 이미 선택된 프로젝트는 상단 섹션에 표시하므로 목록에서 제외
    return selectedProjectId
      ? list.filter(p => p.id !== selectedProjectId)
      : list;
  }, [activeProjects, search, selectedProjectId]);

  const handleSelect = useCallback(
    (projectId: string) => {
      // 같은 프로젝트 탭 → 해제
      if (projectId === selectedProjectId) {
        onSelect(null);
      } else {
        onSelect(projectId);
      }
      onClose();
    },
    [selectedProjectId, onSelect, onClose],
  );

  const handleUnlink = useCallback(() => {
    onSelect(null);
    onClose();
  }, [onSelect, onClose]);

  const renderItem = useCallback(
    ({item}: {item: Project}) => (
      <Pressable
        onPress={() => handleSelect(item.id)}
        style={({pressed}) => [
          styles.projectItemPressable,
          pressed && styles.projectItemPressed,
        ]}>
        <View style={styles.projectItemRow}>
          <View style={[styles.colorDot, {backgroundColor: item.color ?? '#A8DADC'}]} />
          {item.icon ? (
            <Text style={styles.projectIcon}>{item.icon}</Text>
          ) : null}
          <Text style={styles.projectTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </Pressable>
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback((item: Project) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, {paddingTop: insets.top + 8}]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>프로젝트 선택</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={22} color="#6B7280" />
          </Pressable>
        </View>

        {/* 검색바 */}
        <View style={styles.searchBar}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="프로젝트 검색"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>

        {/* 연결된 프로젝트 */}
        {selectedProject && !search.trim() && (
          <View style={styles.selectedSection}>
            <Text style={[styles.sectionLabel, {paddingHorizontal: 0}]}>연결된 프로젝트</Text>
            <View style={styles.selectedRow}>
              <View
                style={[
                  styles.colorDot,
                  {backgroundColor: selectedProject.color ?? '#A8DADC'},
                ]}
              />
              {selectedProject.icon ? (
                <Text style={styles.projectIcon}>{selectedProject.icon}</Text>
              ) : null}
              <Text style={styles.selectedTitle} numberOfLines={1}>
                {selectedProject.title}
              </Text>
              <Pressable
                onPress={handleUnlink}
                hitSlop={8}
                style={styles.unlinkBtn}>
                <Unlink size={14} color="#9CA3AF" />
                <Text style={styles.unlinkText}>해제</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 프로젝트 목록 */}
        <FlatList
          data={filteredProjects}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 20},
          ]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            filteredProjects.length > 0 ? (
              <Text style={styles.sectionLabel}>
                {selectedProjectId ? '다른 프로젝트' : '프로젝트'}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {search.trim()
                  ? '검색 결과가 없습니다'
                  : '프로젝트가 없습니다'}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 10,
  },
  selectedSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  selectedTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unlinkText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  listContent: {
    paddingTop: 12,
  },
  projectItemPressable: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  projectItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  projectItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  projectIcon: {
    fontSize: 16,
  },
  projectTitle: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
