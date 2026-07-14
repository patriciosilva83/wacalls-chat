import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Plus, Trash2, Edit2, Search, Calendar, User, Eye, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/stores/auth";

interface Announcement {
  id: string;
  title: string;      // Título do aviso
  content: string;    // Conteúdo
  target: "all" | "agents" | "admins"; // Destinatários
  date: string;       // Data de publicação
  author: string;     // Nome do autor
}

const TARGET_LABEL: Record<string, string> = {
  all: "Todos",
  agents: "Atendentes",
  admins: "Administradores",
};

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const isAdmin = user?.roles?.includes("admin") || user?.roles?.includes("superadmin");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [filterTarget, setFilterTarget] = useState<"all" | "agents" | "admins" | "any">("any");
  const [loading, setLoading] = useState(true);

  // Form / Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState<"all" | "agents" | "admins">("all");

  const loadAnnouncements = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("wacalls.announcements");
      if (stored) {
        setAnnouncements(JSON.parse(stored));
      } else {
        const samples: Announcement[] = [
          {
            id: "ann_1",
            title: "Atualização de Recursos do Plano Gratuito",
            content: "Olá equipe! O limite de ligações do plano gratuito agora é gerenciável no painel administrativo pelo Super Admin. Certifiquem-se de orientar os clientes novos sobre as cotas semanais.",
            target: "all",
            date: new Date().toISOString().split("T")[0],
            author: "Super Admin",
          },
          {
            id: "ann_2",
            title: "Nova funcionalidade de URA com Música de Espera",
            content: "Importante: Agora é possível subir músicas de espera personalizadas por fila de atendimento e também uma música global no painel de agentes. Testem e enviem feedbacks.",
            target: "agents",
            date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
            author: "Suporte Técnico",
          },
        ];
        setAnnouncements(samples);
        localStorage.setItem("wacalls.announcements", JSON.stringify(samples));
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleOpenAdd = () => {
    setEditingAnn(null);
    setTitle("");
    setContent("");
    setTarget("all");
    setModalOpen(true);
  };

  const handleOpenEdit = (ann: Announcement) => {
    setEditingAnn(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setTarget(ann.target);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    let updatedList: Announcement[];

    if (editingAnn) {
      const updated: Announcement = {
        ...editingAnn,
        title: title.trim(),
        content: content.trim(),
        target,
      };
      updatedList = announcements.map((a) => (a.id === editingAnn.id ? updated : a));
      toast.success("Comunicado atualizado");
    } else {
      const newAnn: Announcement = {
        id: `ann_${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        target,
        date: new Date().toISOString().split("T")[0],
        author: user?.name || "Administrador",
      };
      updatedList = [newAnn, ...announcements];
      toast.success("Aviso publicado no mural");
    }

    setAnnouncements(updatedList);
    localStorage.setItem("wacalls.announcements", JSON.stringify(updatedList));
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const updated = announcements.filter((a) => a.id !== deletingId);
    setAnnouncements(updated);
    localStorage.setItem("wacalls.announcements", JSON.stringify(updated));
    toast.success("Comunicado removido do mural");
    setDeletingId(null);
  };

  const filtered = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(search.toLowerCase()) ||
      ann.content.toLowerCase().includes(search.toLowerCase()) ||
      ann.author.toLowerCase().includes(search.toLowerCase());

    const matchesTarget =
      filterTarget === "any" || ann.target === filterTarget;

    // Se o usuário logado for atendente comum, não mostre comunicados exclusivos de admins
    const canSee = isAdmin || ann.target !== "admins";

    return matchesSearch && matchesTarget && canSee;
  });

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mural de Avisos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fique por dentro de atualizações, comunicados internos e avisos importantes da operação.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Comunicado
            </Button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 max-w-sm flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar comunicados..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex border rounded-lg bg-muted/40 p-0.5 text-xs font-semibold gap-1">
            <button
              onClick={() => setFilterTarget("any")}
              className={`px-3 py-1 rounded-md transition ${
                filterTarget === "any" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Qualquer Destinatário
            </button>
            <button
              onClick={() => setFilterTarget("all")}
              className={`px-3 py-1 rounded-md transition ${
                filterTarget === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterTarget("agents")}
              className={`px-3 py-1 rounded-md transition ${
                filterTarget === "agents" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Atendentes
            </button>
            {isAdmin && (
              <button
                onClick={() => setFilterTarget("admins")}
                className={`px-3 py-1 rounded-md transition ${
                  filterTarget === "admins" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Admins
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Megaphone className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhum aviso no mural</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Nenhum comunicado foi publicado para os critérios selecionados.
              </p>
              {isAdmin && (
                <Button className="mt-6" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-1" />
                  Publicar Primeiro Aviso
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {filtered.map((ann) => (
                <div
                  key={ann.id}
                  className="flex flex-col rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-all border-border/60 justify-between gap-4"
                >
                  <div>
                    {/* Top line metadata */}
                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-border/40">
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span>Publicado por: <strong>{ann.author}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>{new Date(ann.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>

                      {/* Destination Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ann.target === "admins"
                            ? "text-rose-500 bg-rose-500/10"
                            : ann.target === "agents"
                            ? "text-amber-500 bg-amber-500/10"
                            : "text-primary bg-primary/10"
                        }`}
                      >
                        <Eye className="h-3 w-3" />
                        {TARGET_LABEL[ann.target] || ann.target}
                      </span>
                    </div>

                    <h2 className="font-bold text-base text-foreground leading-snug">{ann.title}</h2>
                    <p className="text-xs text-muted-foreground/90 mt-3 whitespace-pre-line leading-relaxed">
                      {ann.content}
                    </p>
                  </div>

                  {/* Actions Footer (Admins only) */}
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-border/40 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(ann.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t("actions.remove")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(ann)}
                        className="h-8 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        {t("actions.edit")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog Form */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAnn ? t("actions.edit") : "Publicar"} Comunicado
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Título do Comunicado</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Manutenção agendada do servidor"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label>Destinatários</Label>
                  <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value as any)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                    required
                  >
                    <option value="all">Todos</option>
                    <option value="agents">Atendentes</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Conteúdo do Aviso</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva a mensagem completa do comunicado..."
                  rows={6}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
          title="Remover comunicado do mural?"
          description="O aviso deixará de aparecer no painel de avisos para todos os usuários destinatários."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
