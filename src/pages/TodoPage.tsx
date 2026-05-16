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

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    (async () => {
      try {
        const data = await todoApi.getAll();
        setTodos(data);
      } catch (err) {
        setError(getErrorMessage(err, '加载待办失败，请刷新重试'));
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setError('');
    setLoading(true);
    try {
      const todo = await todoApi.create(content, pendingFiles);
      setTodos(prev => [todo, ...prev]);
      setContent(''); setPendingFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(getErrorMessage(err, '创建待办失败，请重试'));
    } finally { setLoading(false); }
  };

  const handleToggle = async (todo: Todo) => {
    setError('');
    try {
      const updated = await todoApi.update(todo.id, { is_done: !todo.is_done });
      setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
    } catch (err) {
      setError(getErrorMessage(err, '更新待办失败，请重试'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm('确认删除这条待办？相关图片也会一并删除。')) return;
    setError('');
    try {
      await todoApi.remove(id);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, '删除待办失败，请重试'));
    }
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">待办事项</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
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
            <Button onClick={handleCreate} disabled={loading} variant="default">
              添加
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

      <TodoList title="待完成" items={pending} onToggle={handleToggle} onDelete={handleDelete} onDeleteImage={handleDeleteImage} />
      {done.length > 0 && (
        <TodoList title="已完成" items={done} onToggle={handleToggle} onDelete={handleDelete} onDeleteImage={handleDeleteImage} />
      )}
      {dialog}
    </div>
  );
}

function TodoList({ title, items, onToggle, onDelete, onDeleteImage }: {
  title: string; items: Todo[];
  onToggle: (t: Todo) => void; onDelete: (id: number) => void;
  onDeleteImage: (todoId: number, imageId: number) => void;
}) {
  if (items.length === 0) return null;
  const isDoneList = items.length > 0 && items[0].is_done;
  return (
    <div className={isDoneList ? 'opacity-70' : undefined}>
      <h2 className="text-sm font-medium text-muted-foreground mb-2">{title}（{items.length}）</h2>
      <div className="space-y-2">
        {items.map(todo => (
          <Card key={todo.id} className={todo.is_done ? 'bg-muted/40' : undefined}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={todo.is_done}
                  onCheckedChange={() => onToggle(todo)}
                  aria-label={`标记 ${todo.content} 为${todo.is_done ? '未完成' : '已完成'}`}
                  className="mt-0.5"
                />
                <span className={`flex-1 text-sm ${todo.is_done ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.content}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(todo.id)}
                  aria-label="删除待办"
                >
                  删除
                </Button>
              </div>
              <ImageGallery images={todo.images} onDelete={imageId => onDeleteImage(todo.id, imageId)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
