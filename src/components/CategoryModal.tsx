import { useState, useEffect, useCallback } from 'react';
import { categoryApi } from '../api/category';
import { getErrorMessage } from '../api/http';
import type { CategoryTree } from '../api/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CategoryModal({ open, onClose }: Props) {
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [newPrimaryName, setNewPrimaryName] = useState('');
  const [newSubInputs, setNewSubInputs] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    categoryApi.getAll()
      .then((data) => { if (active) setTree(data); })
      .catch(() => { if (active) setError('加载分类失败'); });
    return () => { active = false; };
  }, [open, refreshCount]);

  const handleAddPrimary = async () => {
    if (!newPrimaryName.trim()) return;
    setError('');
    try {
      await categoryApi.create(newPrimaryName.trim());
      setNewPrimaryName('');
      refresh();
    } catch {
      setError('新增主分类失败');
    }
  };

  const handleAddSub = async (parentId: number) => {
    const name = (newSubInputs[parentId] ?? '').trim();
    if (!name) return;
    setError('');
    try {
      await categoryApi.create(name, parentId);
      setNewSubInputs((prev) => ({ ...prev, [parentId]: '' }));
      refresh();
    } catch {
      setError('新增子分类失败');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setError('');
    try {
      await categoryApi.remove(id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, '删除失败'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理分类</DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-red-500 text-sm mb-2">{error}</p>
        )}

        <div className="space-y-4">
          {tree.map((primary) => (
            <div key={primary.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{primary.name}</span>
                {!primary.is_builtin && (
                  <button
                    className="text-destructive text-xs hover:underline"
                    onClick={() => handleDeleteCategory(primary.id)}
                  >
                    删除
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {primary.children.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-0.5">
                    <Badge
                      variant={sub.is_builtin ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {sub.name}
                    </Badge>
                    {!sub.is_builtin && (
                      <button
                        className="text-destructive text-xs leading-none"
                        onClick={() => handleDeleteCategory(sub.id)}
                        aria-label={`删除 ${sub.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-1">
                <Input
                  value={newSubInputs[primary.id] ?? ''}
                  onChange={(e) =>
                    setNewSubInputs((prev) => ({
                      ...prev,
                      [primary.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleAddSub(primary.id)
                  }
                  placeholder="+ 子分类"
                  className="h-7 text-xs"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => handleAddSub(primary.id)}
                >
                  添加
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mt-4 pt-4 border-t">
          <Input
            value={newPrimaryName}
            onChange={(e) => setNewPrimaryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPrimary()}
            placeholder="+ 新增主分类"
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleAddPrimary}>
            添加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
