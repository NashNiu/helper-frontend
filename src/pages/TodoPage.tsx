import { useState, useEffect, useRef } from 'react';
import { todoApi } from '../api/todo';
import ImageGallery from '../components/ImageGallery';
import type { Todo } from '../api/todo';
import { getErrorMessage } from '../api/http';

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!window.confirm('确认删除这条待办？相关图片也会一并删除。')) return;
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
      <h1 className="text-2xl font-bold text-gray-800">待办事项</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
        <div className="flex gap-2">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleCreate()}
            placeholder="添加待办..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            📷 {pendingFiles.length > 0 && `(${pendingFiles.length})`}
          </button>
          <button onClick={handleCreate} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            添加
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => setPendingFiles(Array.from(e.target.files ?? []))} />
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{f.name}</div>
            ))}
          </div>
        )}
      </div>

      <TodoList title="待完成" items={pending} onToggle={handleToggle} onDelete={handleDelete} onDeleteImage={handleDeleteImage} />
      {done.length > 0 && (
        <TodoList title="已完成" items={done} onToggle={handleToggle} onDelete={handleDelete} onDeleteImage={handleDeleteImage} />
      )}
    </div>
  );
}

function TodoList({ title, items, onToggle, onDelete, onDeleteImage }: {
  title: string; items: Todo[];
  onToggle: (t: Todo) => void; onDelete: (id: number) => void;
  onDeleteImage: (todoId: number, imageId: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-500 mb-2">{title}（{items.length}）</h2>
      <div className="space-y-2">
        {items.map(todo => (
          <div key={todo.id} className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={todo.is_done} onChange={() => onToggle(todo)}
                aria-label={`标记 ${todo.content} 为${todo.is_done ? '未完成' : '已完成'}`}
                className="mt-1 h-4 w-4 accent-indigo-600 cursor-pointer" />
              <span className={`flex-1 text-sm ${todo.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {todo.content}
              </span>
              <button onClick={() => onDelete(todo.id)} aria-label="删除待办"
                className="text-xs text-red-400 hover:text-red-600">删除</button>
            </div>
            <ImageGallery images={todo.images} onDelete={imageId => onDeleteImage(todo.id, imageId)} />
          </div>
        ))}
      </div>
    </div>
  );
}
