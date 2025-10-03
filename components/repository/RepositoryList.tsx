"use client";

import { useState, useEffect } from "react";
import { useRepositoryStore } from "@/state/stores/repositoryStore";
import { useAuthStore } from "@/state/stores/authStore";
import { useTodoStore } from "@/state/stores/todoStore";
import { RepositoryCard } from "./RepositoryCard";
import { RepositoryForm } from "./RepositoryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  Archive,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

/**
 * 보관함 목록 컴포넌트
 */
export function RepositoryList() {
  const { user } = useAuthStore();
  const {
    items,
    loading,
    error,
    getFilteredItems,
    setSearchQuery,
    setTypeFilter,
    setCategoryFilter,
    filters,
    getAllCategories,
    stats,
    moveToCategory,
    dragState,
  } = useRepositoryStore();
  const { createTodo } = useTodoStore();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isVisible, setIsVisible] = useState(() => {
    // localStorage에서 초기값 로드 (기본값: true)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("daystep-repository-visible");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const filteredItems = getFilteredItems();
  const categories = getAllCategories();

  // 보관함 가시성 토글 핸들러
  const handleToggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);

    // localStorage에 저장
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "daystep-repository-visible",
        JSON.stringify(newVisibility)
      );
    }
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value === "all" ? "all" : (value as "todo"));
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value === "all" ? "all" : value);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
  };

  const handleCopyToTodo = async (item: any) => {
    try {
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      const content = item.type === "todo" ? item.content : item.title;

      // 로딩 토스트 표시
      const loadingToast = toast.loading("할일로 복사하는 중...");

      await createTodo({
        content: content,
        schedule_type: "anytime",
        completed: false,
        order_index: 0,
      });

      // 성공 토스트로 교체
      toast.success("보관함 아이템이 할일로 복사되었습니다!", {
        id: loadingToast,
        description: `"${item.title.slice(0, 30)}${item.title.length > 30 ? "..." : ""}"`,
      });
    } catch (error) {
      console.error("할일 복사 오류:", error);
      toast.error("할일 복사 중 오류가 발생했습니다.", {
        description: "잠시 후 다시 시도해주세요.",
      });
    }
  };

  const hasActiveFilters = () => {
    return (
      filters.searchQuery ||
      filters.type !== "all" ||
      filters.category !== "all"
    );
  };

  // 카테고리 드롭 핸들러
  const handleCategoryDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(category);
  };

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);
  };

  const handleCategoryDrop = async (e: React.DragEvent, category: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));

      if (
        data.type === "repository-item" &&
        data.item &&
        dragState.draggedItem
      ) {
        const targetCategory = category === "uncategorized" ? null : category;
        await moveToCategory(dragState.draggedItem.id, targetCategory);
        console.log(`아이템이 ${category} 카테고리로 이동되었습니다.`);
      }
    } catch (error) {
      console.error("카테고리 이동 오류:", error);
    }
  };

  if (loading && filteredItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">보관함을 불러오는 중...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">오류가 발생했습니다: {error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 및 가시성 토글 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleVisibility}
            className="flex items-center gap-2"
          >
            {isVisible ? (
              <>
                <EyeOff className="w-4 h-4" />
                보관함 숨기기
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                보관함 보기
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-gray-500" />
            <h2 className="text-2xl font-bold text-gray-900">
              보관함 ({stats.totalCount})
            </h2>
          </div>
        </div>

        {isVisible && (
          <Button
            onClick={handleCreateItem}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />새 아이템 추가
          </Button>
        )}
      </div>

      {/* 보관함이 숨겨진 경우 */}
      {!isVisible && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>보관함이 숨겨져 있습니다</p>
              <p className="text-sm mt-1">
                {stats.totalCount}개의 아이템이 보관되어 있습니다
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isVisible && (
        <>
          {/* 통계 배지 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm">
              전체 {stats.totalCount}
            </Badge>
            <Badge variant="outline" className="text-sm text-green-600">
              할일 {stats.typeBreakdown.todo}
            </Badge>
            {Object.keys(stats.categoryBreakdown).length > 0 && (
              <Badge variant="outline" className="text-sm text-gray-600">
                카테고리 {Object.keys(stats.categoryBreakdown).length}
              </Badge>
            )}
          </div>

          {/* 드래그 가능한 카테고리 드롭 존 */}
          {dragState.isDragging && categories.length > 0 && (
            <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Archive className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    카테고리로 이동
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-xs cursor-pointer hover:bg-gray-100 transition-colors ${
                      dragOverCategory === "uncategorized"
                        ? "bg-blue-100 border-blue-300"
                        : ""
                    }`}
                    onDragOver={(e) =>
                      handleCategoryDragOver(e, "uncategorized")
                    }
                    onDragLeave={handleCategoryDragLeave}
                    onDrop={(e) => handleCategoryDrop(e, "uncategorized")}
                  >
                    미분류 ({stats.categoryBreakdown["미분류"] || 0})
                  </Badge>
                  {categories
                    .filter((cat) => cat !== "미분류")
                    .map((category) => (
                      <Badge
                        key={category}
                        variant="outline"
                        className={`text-xs cursor-pointer hover:bg-gray-100 transition-colors ${
                          dragOverCategory === category
                            ? "bg-blue-100 border-blue-300"
                            : ""
                        }`}
                        onDragOver={(e) => handleCategoryDragOver(e, category)}
                        onDragLeave={handleCategoryDragLeave}
                        onDrop={(e) => handleCategoryDrop(e, category)}
                      >
                        {category} ({stats.categoryBreakdown[category] || 0})
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 검색 및 필터 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* 검색 */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="보관함 아이템 검색..."
                    value={filters.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* 필터 컨트롤 */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 타입 필터 */}
                  <Select
                    value={filters.type || "all"}
                    onValueChange={handleTypeFilterChange}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 타입</SelectItem>
                      <SelectItem value="todo">할일</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 카테고리 필터 */}
                  <Select
                    value={filters.category || "all"}
                    onValueChange={handleCategoryFilterChange}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 카테고리</SelectItem>
                      <SelectItem value="uncategorized">미분류</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 필터 초기화 */}
                  {hasActiveFilters() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      초기화
                    </Button>
                  )}
                </div>
              </div>

              {/* 활성 필터 표시 */}
              {hasActiveFilters() && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Filter className="w-4 h-4" />
                    <span>활성 필터:</span>
                    <div className="flex gap-1 flex-wrap">
                      {filters.type !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          {filters.type === "todo" ? "할일" : "다짐"}
                        </Badge>
                      )}
                      {filters.category !== "all" && (
                        <Badge variant="secondary" className="text-xs">
                          {filters.category === "uncategorized"
                            ? "미분류"
                            : filters.category}
                        </Badge>
                      )}
                      {filters.searchQuery && (
                        <Badge variant="secondary" className="text-xs">
                          검색: &ldquo;{filters.searchQuery}&rdquo;
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 보관함 아이템 목록 */}
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <Archive className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {hasActiveFilters()
                      ? "검색 결과가 없습니다"
                      : "보관함이 비어있습니다"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {hasActiveFilters()
                      ? "다른 검색어나 필터를 시도해보세요"
                      : "재사용 가능한 템플릿이나 중요한 내용을 보관해보세요"}
                  </p>
                  {!hasActiveFilters() && (
                    <Button
                      onClick={handleCreateItem}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />첫 번째 아이템 추가
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <RepositoryCard
                  key={item.id}
                  item={item}
                  onEdit={() => handleEditItem(item)}
                  onCopyToTodo={() => handleCopyToTodo(item)}
                  searchQuery={filters.searchQuery}
                />
              ))}
            </div>
          )}

          {/* 폼 다이얼로그 */}
          {showForm && user && (
            <RepositoryForm
              item={editingItem}
              onClose={handleCloseForm}
              userId={user.id}
            />
          )}
        </>
      )}
    </div>
  );
}
