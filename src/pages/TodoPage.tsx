import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { todoApi } from '../api/todo';
import ImageGallery from '../components/ImageGallery';
import ImageLightbox from '../components/ImageLightbox';
import type { Todo } from '../api/todo';
import { getErrorMessage } from '../api/http';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { todoCategoryApi } from '../api/todoCategory';
import type { TodoCategory } from '../api/todoCategory';

const MAX_IMAGES = 9;

interface PendingImage {
  file: File;
  url: string; // 由 URL.createObjectURL(file) 生成,用于缩略图预览
}

const CATEGORY_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-pink-50 dark:bg-pink-950', text: 'text-pink-600 dark:text-pink-400' },
  { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-600 dark:text-yellow-400' },
] as const;

function getCategoryColor(id: number) {
  return CATEGORY_COLORS[id % CATEGORY_COLORS.length];
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [content, setContent] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingLightboxIndex, setPendingLightboxIndex] = useState<number | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [operatingIds, setOperatingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [categories, setCategories] = useState<TodoCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null | 'none'>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setDraft(todo.content);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };
  const saveEdit = async () => {
    if (editingId === null) return;
    const content = draft.trim();
    if (!content) return;
    setError('');
    setSavingEdit(true);
    try {
      const updated = await todoApi.update(editingId, { content });
      setTodos((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      cancelEdit();
    } catch (err) {
      setError(getErrorMessage(err, '保存失败，请重试'));
    } finally {
      setSavingEdit(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const { confirm, dialog } = useConfirm();

  const addOp = (id: number) => setOperatingIds((prev) => new Set(prev).add(id));
  const removeOp = (id: number) =>
    setOperatingIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });

  const addPendingFiles = (files: File[]) => {
    if (files.length === 0) return;
    const room = MAX_IMAGES - pendingImages.length;
    if (room <= 0) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    setError(files.length > room ? `最多上传 ${MAX_IMAGES} 张图片，部分图片未添加` : '');
    const accepted = files.slice(0, room);
    const additions = accepted.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPendingImages((prev) => [...prev, ...additions]);
  };

  const removePendingImage = (index: number) => {
    const target = pendingImages[index];
    if (target) URL.revokeObjectURL(target.url);
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearPendingImages = () => {
    pendingImages.forEach((p) => URL.revokeObjectURL(p.url));
    setPendingImages([]);
    setPendingLightboxIndex(null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, cats] = await Promise.all([todoApi.getAll(), todoCategoryApi.getAll()]);
        if (!cancelled) {
          setTodos(data);
          setCategories(cats);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '加载待办失败，请刷新重试'));
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 同步最新的 pendingImages 到 ref,使下面空依赖的卸载清理能 revoke 最新值而非闭包里的陈旧值。
  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  // 仅在组件卸载时执行:通过 ref 读取最新的 pendingImages 来 revoke,避免空依赖闭包捕获到陈旧值。
  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setError('');
    setCreating(true);
    try {
      const todo = await todoApi.create(
        content,
        pendingImages.map((p) => p.file),
        selectedCategoryId ?? undefined,
      );
      setTodos((prev) => [todo, ...prev]);
      setContent('');
      clearPendingImages();
      setSelectedCategoryId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(getErrorMessage(err, '创建待办失败，请重试'));
    } finally {
      setCreating(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length === 0) return; // 纯文本粘贴走默认行为
    e.preventDefault();
    addPendingFiles(imageFiles);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const cat = await todoCategoryApi.create(newCategoryName.trim());
      setCategories((prev) => [...prev, cat]);
      setNewCategoryName('');
    } catch (err) {
      setError(getErrorMessage(err, '创建分类失败'));
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await todoCategoryApi.remove(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setTodos((prev) => prev.map((t) => (t.category?.id === id ? { ...t, category: null } : t)));
      if (selectedCategoryId === id) setSelectedCategoryId(null);
      if (filterCategoryId === id) setFilterCategoryId(null);
    } catch (err) {
      setError(getErrorMessage(err, '删除分类失败'));
    }
  };

  const handleRenameCategory = async (id: number) => {
    if (!renameDraft.trim()) return;
    try {
      const updated = await todoCategoryApi.rename(id, renameDraft.trim());
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setTodos((prev) =>
        prev.map((t) => (t.category?.id === id ? { ...t, category: updated } : t))
      );
      setRenamingCategoryId(null);
      setRenameDraft('');
    } catch (err) {
      setError(getErrorMessage(err, '重命名分类失败'));
    }
  };

  const handleCategoryChange = async (todoId: number, categoryId: number | null) => {
    setError('');
    try {
      const updated = await todoApi.update(todoId, { category_id: categoryId });
      setTodos((prev) => prev.map((t) => (t.id === todoId ? updated : t)));
    } catch (err) {
      setError(getErrorMessage(err, '更新分类失败'));
    }
  };

  const handleToggle = async (todo: Todo) => {
    if (operatingIds.has(todo.id)) return;
    setError('');
    addOp(todo.id);
    try {
      const updated = await todoApi.update(todo.id, { is_done: !todo.is_done });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      setError(getErrorMessage(err, '更新待办失败，请重试'));
    } finally {
      removeOp(todo.id);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirm('确认删除这条待办？相关图片也会一并删除。'))) return;
    setError('');
    addOp(id);
    try {
      await todoApi.remove(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, '删除待办失败，请重试'));
    } finally {
      removeOp(id);
    }
  };

  const handleDeleteImage = async (todoId: number, imageId: number) => {
    setError('');
    try {
      await todoApi.removeImage(todoId, imageId);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId ? { ...t, images: t.images.filter((i) => i.id !== imageId) } : t
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, '删除图片失败，请重试'));
    }
  };

  const filteredTodos =
    filterCategoryId === null
      ? todos
      : filterCategoryId === 'none'
        ? todos.filter((t) => t.category === null)
        : todos.filter((t) => t.category?.id === filterCategoryId);

  const pending = filteredTodos.filter((t) => !t.is_done);
  const done = filteredTodos.filter((t) => t.is_done);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-shrink-0 space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">待办事项</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !creating && handleCreate()}
                onPaste={handlePaste}
                placeholder="添加待办..."
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                aria-label="上传图片"
                className="relative"
              >
                <PhotoIcon className="w-4 h-4" />
                {pendingImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {pendingImages.length}
                  </span>
                )}
              </Button>
              <Button onClick={handleCreate} disabled={creating} variant="default">
                {creating ? <Spinner className="h-4 w-4 mr-1" /> : null}
                {creating ? '添加中…' : '添加'}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addPendingFiles(Array.from(e.target.files ?? []));
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingImages.map((img, i) => (
                  <div key={img.url} className="relative group w-16 h-16 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setPendingLightboxIndex(i)}
                      className="block w-16 h-16"
                      aria-label={`查看待上传图片 ${i + 1}`}
                    >
                      <img
                        src={img.url}
                        alt={`待上传图片 ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border hover:opacity-90"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePendingImage(i)}
                      aria-label={`移除待上传图片 ${i + 1}`}
                      className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 text-white rounded-full w-3.5 h-3.5 hidden group-hover:flex items-center justify-center focus:flex"
                    >
                      <svg
                        viewBox="0 0 10 10"
                        className="w-2 h-2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <line x1="2" y1="2" x2="8" y2="8" />
                        <line x1="8" y1="2" x2="2" y2="8" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Category tag bar */}
            {!managingCategories ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex-shrink-0">分类：</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={`text-xs rounded-full px-3 py-0.5 border transition-colors ${
                    selectedCategoryId === null
                      ? 'border-primary text-primary bg-primary/10 font-medium'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  无
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)
                    }
                    className={`text-xs rounded-full px-3 py-0.5 border transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'border-primary text-primary bg-primary/10 font-medium'
                        : 'border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setManagingCategories(true)}
                  className="text-xs rounded-full px-3 py-0.5 border border-dashed border-border text-muted-foreground hover:border-foreground/30 transition-colors"
                  aria-label="管理分类"
                >
                  ＋
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {categories.map((cat) =>
                    renamingCategoryId === cat.id ? (
                      <div key={cat.id} className="inline-flex items-center gap-1">
                        <Input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameCategory(cat.id);
                            if (e.key === 'Escape') {
                              setRenamingCategoryId(null);
                              setRenameDraft('');
                            }
                          }}
                          maxLength={50}
                          autoFocus
                          className="h-6 text-xs w-24 rounded-full px-2"
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameCategory(cat.id)}
                          className="w-4 h-4 rounded-full bg-primary/20 hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-[10px] transition-colors"
                          aria-label="确认重命名"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCategoryId(null);
                            setRenameDraft('');
                          }}
                          className="w-4 h-4 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-[9px] transition-colors"
                          aria-label="取消重命名"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <span
                        key={cat.id}
                        className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 bg-muted text-foreground border border-border"
                      >
                        {cat.name}
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCategoryId(cat.id);
                            setRenameDraft(cat.name);
                          }}
                          className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-[9px] leading-none transition-colors"
                          aria-label={`重命名分类 ${cat.name}`}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-[9px] leading-none transition-colors"
                          aria-label={`删除分类 ${cat.name}`}
                        >
                          ×
                        </button>
                      </span>
                    )
                  )}
                  {categories.length === 0 && (
                    <span className="text-xs text-muted-foreground">暂无分类</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && !creatingCategory && handleCreateCategory()
                    }
                    placeholder="新分类名称..."
                    maxLength={50}
                    className="flex-1 h-7 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory || !newCategoryName.trim()}
                    className="h-7 text-xs"
                  >
                    添加
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setManagingCategories(false);
                      setNewCategoryName('');
                    }}
                    className="h-7 text-xs"
                  >
                    关闭
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="text-xs text-muted-foreground flex-shrink-0">筛选：</span>
            {(
              [
                { label: '全部', value: null as number | null | 'none' },
                { label: '无分类', value: 'none' as const },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ] as const
            ).map(({ label, value }) => (
              <button
                key={value === null ? '__all__' : value === 'none' ? '__none__' : String(value)}
                type="button"
                onClick={() => setFilterCategoryId(value as number | null | 'none')}
                className={`text-xs rounded-full px-3 py-0.5 border whitespace-nowrap flex-shrink-0 transition-colors ${
                  filterCategoryId === value
                    ? 'bg-foreground text-background border-foreground font-medium'
                    : 'border-border text-muted-foreground hover:border-foreground/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
        {fetchLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-muted-foreground" />
          </div>
        ) : (
          <>
            <TodoList
              title="待完成"
              items={pending}
              operatingIds={operatingIds}
              editingId={editingId}
              draft={draft}
              savingEdit={savingEdit}
              categories={categories}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onDraftChange={setDraft}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onDeleteImage={handleDeleteImage}
              onCategoryChange={handleCategoryChange}
            />
            {done.length > 0 && (
              <TodoList
                title="已完成"
                items={done}
                operatingIds={operatingIds}
                editingId={editingId}
                draft={draft}
                savingEdit={savingEdit}
                categories={categories}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                onDraftChange={setDraft}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onDeleteImage={handleDeleteImage}
                onCategoryChange={handleCategoryChange}
              />
            )}
            {pending.length === 0 && done.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {filterCategoryId !== null ? '该分类下暂无待办' : '暂无待办'}
              </p>
            )}
          </>
        )}
      </div>
      {dialog}
      <ImageLightbox
        sources={pendingImages.map((p) => p.url)}
        index={pendingLightboxIndex}
        onClose={() => setPendingLightboxIndex(null)}
        onNavigate={setPendingLightboxIndex}
      />
    </div>
  );
}

function TodoList({
  title,
  items,
  operatingIds,
  editingId,
  draft,
  savingEdit,
  categories,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
  onToggle,
  onDelete,
  onDeleteImage,
  onCategoryChange,
}: {
  title: string;
  items: Todo[];
  operatingIds: Set<number>;
  editingId: number | null;
  draft: string;
  savingEdit: boolean;
  categories: TodoCategory[];
  onStartEdit: (t: Todo) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (v: string) => void;
  onToggle: (t: Todo) => void;
  onDelete: (id: number) => void;
  onDeleteImage: (todoId: number, imageId: number) => void;
  onCategoryChange: (todoId: number, categoryId: number | null) => void;
}) {
  if (items.length === 0) return null;
  const isDoneList = items.length > 0 && items[0].is_done;
  return (
    <div className={isDoneList ? 'opacity-70' : undefined}>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">
        {title}（{items.length}）
      </h2>
      <div className="space-y-2">
        {items.map((todo) => {
          const busy = operatingIds.has(todo.id);
          const isEditing = editingId === todo.id;
          return (
            <Card key={todo.id} className={todo.is_done ? 'bg-muted/40' : undefined}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {busy ? (
                      <Spinner className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Checkbox
                        checked={todo.is_done}
                        onCheckedChange={() => onToggle(todo)}
                        disabled={isEditing}
                        aria-label={`标记 ${todo.content} 为${todo.is_done ? '未完成' : '已完成'}`}
                      />
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex-1 min-w-0 space-y-2">
                      <Input
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !savingEdit) onSaveEdit();
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        autoFocus
                      />
                      {categories.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            分类：
                          </span>
                          <button
                            type="button"
                            onClick={() => onCategoryChange(todo.id, null)}
                            className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                              !todo.category
                                ? 'border-primary text-primary bg-primary/10 font-medium'
                                : 'border-border text-muted-foreground hover:border-foreground/30'
                            }`}
                          >
                            无
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => onCategoryChange(todo.id, cat.id)}
                              className={`text-xs rounded-full px-2.5 py-0.5 border transition-colors ${
                                todo.category?.id === cat.id
                                  ? 'border-primary text-primary bg-primary/10 font-medium'
                                  : 'border-border text-muted-foreground hover:border-foreground/30'
                              }`}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`flex-1 text-sm ${todo.is_done ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {todo.content}
                    </span>
                  )}
                  {!isEditing &&
                    todo.category &&
                    (() => {
                      const color = getCategoryColor(todo.category.id);
                      return (
                        <span
                          className={`text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0 ${color.bg} ${color.text}`}
                        >
                          {todo.category.name}
                        </span>
                      );
                    })()}
                  {isEditing ? (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={onSaveEdit}
                        disabled={savingEdit || !draft.trim()}
                      >
                        {savingEdit ? <Spinner className="h-4 w-4" /> : '保存'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onCancelEdit}
                        disabled={savingEdit}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onStartEdit(todo)}
                        disabled={busy || editingId !== null}
                        aria-label="编辑待办"
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(todo.id)}
                        disabled={busy || editingId !== null}
                        aria-label="删除待办"
                      >
                        {busy ? <Spinner className="h-4 w-4" /> : '删除'}
                      </Button>
                    </>
                  )}
                </div>
                <ImageGallery
                  images={todo.images}
                  onDelete={(imageId) => onDeleteImage(todo.id, imageId)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
