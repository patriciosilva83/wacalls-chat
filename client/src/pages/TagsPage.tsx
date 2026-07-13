import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tag as TagIcon, Plus, Trash2, Edit2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Tag } from "@/types/tag";
import * as tagsApi from "@/services/tags";

export default function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3b82f6");

  const loadTags = async () => {
    setLoading(true);
    try {
      const list = await tagsApi.listTags();
      setTags(list);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setSaving(true);
    try {
      if (editingTag) {
        await tagsApi.updateTag(editingTag.id, tagName, tagColor);
        setTags(
          tags.map((t) =>
            t.id === editingTag.id ? { ...t, name: tagName, color: tagColor } : t
          )
        );
        toast.success(t("common.save"));
      } else {
        const newTag = await tagsApi.createTag(tagName, tagColor);
        setTags([...tags, newTag]);
        toast.success(t("queues.createdToast"));
      }
      setModalOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor("#3b82f6");
    setModalOpen(true);
  };

  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || "#3b82f6");
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await tagsApi.deleteTag(deletingId);
      setTags(tags.filter((t) => t.id !== deletingId));
      toast.success(t("campaigns.toastDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Tags do Sistema</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie marcadores coloridos para classificar conversas de clientes, leads e atendimentos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={loadTags} variant="outline" className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Tag
            </Button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <TagIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma tag cadastrada</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Use tags para identificar clientes VIPs, status de vendas, leads frios/quentes e muito mais.
              </p>
              <Button className="mt-6" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeira Tag
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between border rounded-xl bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || "#888" }}
                    />
                    <span className="font-semibold text-sm truncate text-foreground">
                      {tag.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(tag)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(tag.id)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog form */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTag ? t("actions.edit") : t("actions.create")} Tag
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Nome da Tag</Label>
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Ex: Lead Quente, Suporte Urgente"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Cor da Tag</Label>
                <Input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="h-10 w-20 px-1"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
          title="Excluir Tag?"
          description="A tag será removida e desvinculada de todas as conversas e contatos ativos."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
