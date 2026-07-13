import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Plus, Trash2, Copy, Play, Pause, Pencil, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { FlowRow, FlowTrigger } from "@/types/flow";
import * as flowsApi from "@/services/flows";

export default function FlowBuilderListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [flowTrigger, setFlowTrigger] = useState<FlowTrigger>("inbound");
  const [flowKind, setFlowKind] = useState<"voice" | "chat">("chat");
  const [flowKeywords, setFlowKeywords] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const list = await flowsApi.listFlows();
      setFlows(list);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFlows();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName.trim()) return;

    try {
      const defaultGraph = flowsApi.serializeGraph({
        nodes: [
          {
            id: "start",
            type: flowKind === "voice" ? "voice_menu" : "chat_text",
            position: { x: 250, y: 150 },
            data: { label: "Início", prompt: "Olá! Como posso ajudar?", text: "Olá! Como posso ajudar?" },
          },
        ],
        edges: [],
        startNodeId: "start",
        kind: flowKind,
      });

      const newFlow = await flowsApi.createFlow({
        name: flowName,
        trigger: flowTrigger,
        graph: defaultGraph,
        keywords: flowTrigger === "inbound" ? flowKeywords : "",
        enabled: false,
      });

      setFlows([...flows, newFlow]);
      setCreateOpen(false);
      toast.success(t("queues.createdToast"));
      // Redirect to editor
      navigate(`/flows/${newFlow.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleToggle = async (flow: FlowRow) => {
    const updated = !flow.enabled;
    // Optimistic
    setFlows(flows.map((f) => (f.id === flow.id ? { ...f, enabled: updated } : f)));
    try {
      await flowsApi.updateFlow(flow.id, { enabled: updated });
      toast.success(updated ? "Fluxo ativado" : "Fluxo desativado");
    } catch (e) {
      toast.error((e as Error).message);
      // Rollback
      setFlows(flows.map((f) => (f.id === flow.id ? f : f)));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const dup = await flowsApi.duplicateFlow(id);
      setFlows([...flows, dup]);
      toast.success("Fluxo duplicado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await flowsApi.deleteFlow(deletingId);
      setFlows(flows.filter((f) => f.id !== deletingId));
      toast.success(t("campaigns.toastDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = flows.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Automação de Fluxos (FlowBuilder)</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie árvores de decisão interativas para ligações de voz e chats de WhatsApp.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("pages.flows.newName")}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 shrink-0 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar fluxos…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Content grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">{t("common.empty")}</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Nenhum fluxo de automação criado ainda. Crie seu primeiro fluxo para começar.
              </p>
              <Button className="mt-6" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t("pages.flows.createFirst")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((flow) => {
                const graph = flowsApi.parseGraph(flow.graph);
                const isVoice = graph.kind === "voice";

                return (
                  <div
                    key={flow.id}
                    className="flex flex-col rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all border-border/60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate text-foreground">
                          {flow.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                              isVoice ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
                            }`}
                          >
                            {isVoice ? "Voz (URA)" : "Chatbot"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Trigger: {flow.trigger}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(flow)}
                        className={`p-1.5 rounded-full transition-colors ${
                          flow.enabled
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                        title={flow.enabled ? "Desativar" : "Ativar"}
                      >
                        {flow.enabled ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </button>
                    </div>

                    {flow.trigger === "inbound" && flow.keywords && (
                      <p className="text-xs text-muted-foreground mt-3 bg-muted/50 p-1.5 rounded truncate">
                        <span className="font-medium text-foreground">Gatilhos:</span> {flow.keywords}
                      </p>
                    )}

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border/40 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(flow.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        {t("actions.duplicate")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(flow.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t("actions.remove")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/flows/${flow.id}`)}
                        className="h-8 text-xs"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        {t("actions.edit")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Creation dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Fluxo de Automacao</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>{t("common.name")}</Label>
                <Input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Ex: URA de Vendas, Chatbot de FAQ"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Tipo do Fluxo</Label>
                  <Select value={flowKind} onValueChange={(val) => setFlowKind(val as "voice" | "chat")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chat">Chatbot (WhatsApp)</SelectItem>
                      <SelectItem value="voice">Voz (URA Telefonica)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Gatilho (Trigger)</Label>
                  <Select value={flowTrigger} onValueChange={(val) => setFlowTrigger(val as FlowTrigger)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">Entrada (Inbound)</SelectItem>
                      <SelectItem value="outbound">Disparo (Outbound)</SelectItem>
                      <SelectItem value="manual">Manual (Painel)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {flowTrigger === "inbound" && (
                <div className="space-y-1">
                  <Label>Palavras-chave (Vírgula para separar)</Label>
                  <Input
                    value={flowKeywords}
                    onChange={(e) => setFlowKeywords(e.target.value)}
                    placeholder="Ex: oi, olá, suporte, ajuda"
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("actions.create")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
          title="Excluir fluxo?"
          description="O fluxo será removido permanentemente. Quaisquer conexões ou campanhas que o utilizem deixarão de funcionar."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
