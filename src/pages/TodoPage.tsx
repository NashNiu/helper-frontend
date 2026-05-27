import { useState, useEffect, useRef } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { todoApi } from '../api/todo';
import ImageGallery from '../components/ImageGallery';
import type { Todo } from '../api/todo';
import { getErrorMessage } from '../api/http';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [operatingIds, setOperatingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
      setTodos(prev => prev.map(t => t.id === editingId ? updated : t));
      cancelEdit();
    } catch (err) {
      setError(getErrorMessage(err, '保存失败，请重试'));
    } finally {
      setSavingEdit(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  const addOp = (id: number) => setOperatingIds(prev => new Set(prev).add(id));
  const removeOp = (id: number) => setOperatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await todoApi.getAll();
        if (!cancelled) setTodos(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, '加载待办失败，请刷新重试'));
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setError('');
    setCreating(true);
    try {
      const todo = await todoApi.create(content, pendingFiles);
      setTodos(prev => [todo, ...prev]);
      setContent(''); setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(getErrorMessage(err, '创建待办失败，请重试'));
    } finally { setCreating(false); }
  };

  const handleToggle = async (todo: Todo) => {
    if (operatingIds.has(todo.id)) return;
    setError('');
    addOp(todo.id);
    try {
      const updated = await todoApi.update(todo.id, { is_done: !todo.is_done });
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
    } catch (err) {
      setError(getErrorMessage(err, '更新待办失败，请重试'));
    } finally { removeOp(todo.id); }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm('确认删除这条待办？相关图片也会一并删除。')) return;
    setError('');
    addOp(id);
    try {
      await todoApi.remove(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, '删除待办失败，请重试'));
    } finally { removeOp(id); }
  };

  const handleDeleteImage = async (todoId: number, imageId: number) => {
    setError('');
    try {
      await todoApi.removeImage(todoId, imageId);
      setTodos(prev => prev.map(t => t.id === todoId ? { ...t, images: t.images.filter(i => i.id !== imageId) } : t));
    } catch (err) {
      setError(getErrorMessage(err, '删除图片失败，请重试'));
    }
  };

  const pending = todos.filter(t => !t.is_done);
  const done = todos.filter(t => t.is_done);

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
                onChange={e => setContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !creating && handleCreate()}
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
                {pendingFiles.length > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {pendingFiles.length}
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
              onChange={e => setPendingFiles(Array.from(e.target.files ?? []))}
            />
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-4">
        {fetchLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-muted-foreground" />
          </div>
        ) : (
          <>
            <TodoList
              title="待完成" items={pending}
              operatingIds={operatingIds}
              editingId={editingId}
              draft={draft}
              savingEdit={savingEdit}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onDraftChange={setDraft}
              onToggle={handleToggle} onDelete={handleDelete} onDeleteImage={handleDeleteImage}
            />
            {done.length > 0 && (
              <TodoList
                title="已完成" items={done}
                operatingIds={operatingIds}
                editingId={editingId}
                draft={draft}
                savingEdit={savingEdit}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                onDraftChange={setDraft}
                onToggle={handleToggle} onDelete={handleDelete} onDeleteImage={handleDeleteImage}
              />
            )}
            {pending.length === 0 && done.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">暂无待办</p>
            )}
          </>
        )}
      </div>
      {dialog}
    </div>
  );
}

function TodoList({
  title, items, operatingIds,
  editingId, draft, savingEdit,
  onStartEdit, onCancelEdit, onSaveEdit, onDraftChange,
  onToggle, onDelete, onDeleteImage,
}: {
  title: string; items: Todo[];
  operatingIds: Set<number>;
  editingId: number | null;
  draft: string;
  savingEdit: boolean;
  onStartEdit: (t: Todo) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDraftChange: (v: string) => void;
  onToggle: (t: Todo) => void; onDelete: (id: number) => void;
  onDeleteImage: (todoId: number, imageId: number) => void;
}) {
  if (items.length === 0) return null;
  const isDoneList = items.length > 0 && items[0].is_done;
  return (
    <div className={isDoneList ? 'opacity-70' : undefined}>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">{title}（{items.length}）</h2>
      <div className="space-y-2">
        {items.map(todo => {
          const busy = operatingIds.has(todo.id);
          const isEditing = editingId === todo.id;
          return (
            <Card key={todo.id} className={todo.is_done ? 'bg-muted/40' : undefined}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center">
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
                    <Input
                      value={draft}
                      onChange={e => onDraftChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !savingEdit) onSaveEdit();
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      autoFocus
                      className="flex-1"
                    />
                  ) : (
                    <span className={`flex-1 text-sm ${todo.is_done ? 'line-through text-muted-foreground' : ''}`}>
                      {todo.content}
                    </span>
                  )}
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
                <ImageGallery images={todo.images} onDelete={imageId => onDeleteImage(todo.id, imageId)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
