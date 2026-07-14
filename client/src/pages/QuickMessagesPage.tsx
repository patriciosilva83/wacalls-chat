import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Plus, Trash2, Edit2, Search } from "lucide-react";
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

interface QuickMessage {
  id: string;
  shortcut: string; // Ex: /bemvindo
  message: string;  // Texto da resposta
}

export default function QuickMessagesPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form / Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<QuickMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [shortcut, setShortcut] = useState("");
  const [message, setMessage] = useState("");

  const loadMessages = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("wacalls.quick_messages");
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        const samples: QuickMessage[] = [
          {
            id: "qm_1",
            shortcut: "/boasvindas",
            message: "Olá! Seja muito bem-vindo ao suporte do WaCalls. Em que posso te ajudar hoje?",
          },
          {
            id: "qm_2",
            shortcut: "/atendimento",
            message: "Entendido! Já estou direcionando o seu caso para um especialista técnico do nosso time.",
          },
          {
            id: "qm_3",
            shortcut: "/obrigado",
            message: "Agradecemos o seu contato! Se precisar de algo mais, estamos à total disposição. Tenha um ótimo dia!",
          },
        ];
        setMessages(samples);
        localStorage.setItem("wacalls.quick_messages", JSON.stringify(samples));
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleOpenAdd = () => {
    setEditingMsg(null);
    setShortcut("/");
    setMessage("");
    setModalOpen(true);
  };

  const handleOpenEdit = (qm: QuickMessage) => {
    setEditingMsg(qm);
    setShortcut(qm.shortcut);
    setMessage(qm.message);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanShortcut = shortcut.trim();
    if (!cleanShortcut.startsWith("/")) {
      cleanShortcut = "/" + cleanShortcut;
    }
    if (cleanShortcut.length < 2) {
      toast.error("O atalho deve conter pelo menos uma letra além da barra");
      return;
    }
    if (!message.trim()) {
      toast.error("O texto da resposta rápida não pode ficar vazio");
      return;
    }

    let updatedList: QuickMessage[];

    if (editingMsg) {
      const updated = {
        ...editingMsg,
        shortcut: cleanShortcut,
        message: message.trim(),
      };
      updatedList = messages.map((m) => (m.id === editingMsg.id ? updated : m));
      toast.success("Resposta rápida atualizada");
    } else {
      const newQM: QuickMessage = {
        id: `qm_${Date.now()}`,
        shortcut: cleanShortcut,
        message: message.trim(),
      };
      updatedList = [...messages, newQM];
      toast.success("Resposta rápida cadastrada");
    }

    setMessages(updatedList);
    localStorage.setItem("wacalls.quick_messages", JSON.stringify(updatedList));
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const updated = messages.filter((m) => m.id !== deletingId);
    setMessages(updated);
    localStorage.setItem("wacalls.quick_messages", JSON.stringify(updated));
    toast.success("Resposta rápida excluída");
    setDeletingId(null);
  };

  const filtered = messages.filter(
    (m) =>
      m.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      m.message.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Respostas Rápidas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie atalhos (ex: /atendimento) para enviar mensagens padronizadas em um clique na tela de chat.
            </p>
          </div>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Resposta
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 shrink-0 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por atalho ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <MessageSquare className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma resposta rápida encontrada</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Cadastre mensagens frequentes para otimizar o tempo de atendimento dos seus operadores.
              </p>
              <Button className="mt-6" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Resposta Rápida
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((qm) => (
                <div
                  key={qm.id}
                  className="flex flex-col rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all border-border/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {qm.shortcut}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4 line-clamp-4 bg-muted/20 p-3 rounded italic leading-relaxed">
                    "{qm.message}"
                  </p>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border/40 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(qm.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t("actions.remove")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(qm)}
                      className="h-8 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      {t("actions.edit")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog Form */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMsg ? t("actions.edit") : t("actions.create")} Resposta Rápida
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Atalho (Deve começar com '/')</Label>
                <Input
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="Ex: /atendimento"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Mensagem Completa</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva a resposta que será enviada aos clientes..."
                  rows={5}
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
          title="Excluir resposta rápida?"
          description="A mensagem será removida permanentemente e os operadores não poderão usá-la pelo atalho."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
