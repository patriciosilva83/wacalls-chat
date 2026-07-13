import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PhoneCall, Megaphone, Plus, Trash2, Play, Pause, Loader2, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import * as campaignsApi from "@/services/campaigns";
import * as broadcastsApi from "@/services/broadcasts";
import { listSessions } from "@/services/sessions";
import { listFlows } from "@/services/flows";
import type { SessionInfo } from "@/types/session";
import type { FlowRow } from "@/types/flow";

export default function CampaignsPage() {
  const { t } = useTranslation();
  
  // Lists
  const [campaigns, setCampaigns] = useState<campaignsApi.Campaign[]>([]);
  const [broadcasts, setBroadcasts] = useState<broadcastsApi.Broadcast[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [uraOpen, setUraOpen] = useState(false);
  const [bcOpen, setBcOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<"ura" | "bc">("ura");

  // Forms
  const [uraName, setUraName] = useState("");
  const [uraSessionId, setUraSessionId] = useState("");
  const [uraFlowId, setUraFlowId] = useState("");
  const [uraDelay, setUraDelay] = useState(30);
  const [uraPhones, setUraPhones] = useState("");

  const [bcName, setBcName] = useState("");
  const [bcSessionId, setBcSessionId] = useState("");
  const [bcMessage, setBcMessage] = useState("");
  const [bcDelay, setBcDelay] = useState(15);
  const [bcContacts, setBcContacts] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, bList, sList, fList] = await Promise.all([
        campaignsApi.listCampaigns().catch(() => []),
        broadcastsApi.listBroadcasts().catch(() => []),
        listSessions().catch(() => []),
        listFlows().catch(() => []),
      ]);
      setCampaigns(cList);
      setBroadcasts(bList);
      setSessions(sList.filter((s) => s.paired));
      setFlows(fList.filter((f) => f.enabled && f.trigger === "outbound"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // ----- URA handlers -----
  const handleCreateUra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uraName.trim() || !uraSessionId || !uraFlowId || !uraPhones.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const phoneList = uraPhones
      .split("\n")
      .map((p) => p.replace(/\D/g, ""))
      .filter((p) => p.length >= 8);

    if (phoneList.length === 0) {
      toast.error("Nenhum número de telefone válido informado.");
      return;
    }

    try {
      const campaign = await campaignsApi.createCampaign({
        name: uraName,
        sessionId: uraSessionId,
        flowId: uraFlowId,
        delaySec: Number(uraDelay),
        kind: "flow",
      });

      // Upload contacts
      await campaignsApi.addContacts(campaign.id, phoneList);

      setCampaigns([...campaigns, campaign]);
      setUraOpen(false);
      toast.success(t("queues.createdToast"));
      void loadData();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleToggleUra = async (c: campaignsApi.Campaign) => {
    const running = c.status === "running";
    try {
      if (running) {
        await campaignsApi.pauseCampaign(c.id);
        toast.success(t("campaigns.toastPaused"));
      } else {
        await campaignsApi.startCampaign(c.id);
        toast.success(t("campaigns.toastStarted"));
      }
      void loadData();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ----- Broadcast handlers -----
  const handleCreateBc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcName.trim() || !bcSessionId || !bcMessage.trim() || !bcContacts.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const recipients = bcContacts
      .split("\n")
      .map((line) => {
        const parts = line.split(",");
        const phone = parts[0].replace(/\D/g, "");
        const name = parts[1]?.trim() || "";
        return { phone, variables: JSON.stringify({ name }) };
      })
      .filter((r) => r.phone.length >= 8);

    if (recipients.length === 0) {
      toast.error("Nenhum contato válido informado.");
      return;
    }

    try {
      const bc = await broadcastsApi.createBroadcast({
        name: bcName,
        sessionId: bcSessionId,
        message: bcMessage,
        delaySec: Number(bcDelay),
        recipients,
      });

      setBroadcasts([...broadcasts, bc]);
      setBcOpen(false);
      toast.success(t("queues.createdToast"));
      void loadData();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleToggleBc = async (b: broadcastsApi.Broadcast) => {
    const running = b.status === "running";
    try {
      if (running) {
        await broadcastsApi.pauseBroadcast(b.id);
        toast.success(t("campaigns.toastPaused"));
      } else {
        await broadcastsApi.startBroadcast(b.id);
        toast.success(t("campaigns.toastStarted"));
      }
      void loadData();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      if (deletingType === "ura") {
        await campaignsApi.deleteCampaign(deletingId);
        setCampaigns(campaigns.filter((c) => c.id !== deletingId));
      } else {
        await broadcastsApi.deleteBroadcast(deletingId);
        setBroadcasts(broadcasts.filter((b) => b.id !== deletingId));
      }
      toast.success(t("campaigns.toastDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const openDeleteConfirm = (id: string, type: "ura" | "bc") => {
    setDeletingId(id);
    setDeletingType(type);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Campanhas & Disparos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Envie mensagens e faça chamadas de voz automáticas em massa para seus clientes.
            </p>
          </div>
          <Button size="sm" onClick={() => void loadData()} variant="outline" className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex h-64 items-center justify-center shrink-0">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="ura" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-80 grid-cols-2 shrink-0">
              <TabsTrigger value="ura" className="flex items-center gap-1.5">
                <PhoneCall className="h-4 w-4" />
                URA (Voz)
              </TabsTrigger>
              <TabsTrigger value="bc" className="flex items-center gap-1.5">
                <Megaphone className="h-4 w-4" />
                Broadcast (WhatsApp)
              </TabsTrigger>
            </TabsList>

            {/* TAB URA */}
            <TabsContent value="ura" className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold">Campanhas de Voz URA</h3>
                <Button size="sm" onClick={() => setUraOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t("pages.campaigns.newUra")}
                </Button>
              </div>

              <div className="flex-1 border rounded-lg overflow-y-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-3 font-semibold text-muted-foreground">Nome</th>
                      <th className="p-3 font-semibold text-muted-foreground">Status</th>
                      <th className="p-3 font-semibold text-muted-foreground">Contatos</th>
                      <th className="p-3 font-semibold text-muted-foreground">Progresso</th>
                      <th className="p-3 font-semibold text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/10">
                        <td className="p-3 font-medium text-foreground">{c.name}</td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                              c.status === "running"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : c.status === "paused"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{c.contactsCount}</td>
                        <td className="p-3 text-muted-foreground">
                          {c.completedCount} / {c.contactsCount}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUra(c)}
                              className="h-8 w-8 p-0"
                            >
                              {c.status === "running" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(c.id, "ura")}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          Nenhuma campanha URA criada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB BROADCAST */}
            <TabsContent value="bc" className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-semibold">Disparos em Massa WhatsApp</h3>
                <Button size="sm" onClick={() => setBcOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Disparo
                </Button>
              </div>

              <div className="flex-1 border rounded-lg overflow-y-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-3 font-semibold text-muted-foreground">Nome</th>
                      <th className="p-3 font-semibold text-muted-foreground">Status</th>
                      <th className="p-3 font-semibold text-muted-foreground">Contatos</th>
                      <th className="p-3 font-semibold text-muted-foreground">Enviados</th>
                      <th className="p-3 font-semibold text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {broadcasts.map((b) => (
                      <tr key={b.id} className="border-b hover:bg-muted/10">
                        <td className="p-3 font-medium text-foreground">{b.name}</td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                              b.status === "running"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : b.status === "paused"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{b.recipientsCount}</td>
                        <td className="p-3 text-muted-foreground">
                          {b.sentCount} / {b.recipientsCount}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleBc(b)}
                              className="h-8 w-8 p-0"
                            >
                              {b.status === "running" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteConfirm(b.id, "bc")}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {broadcasts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          Nenhum disparo em massa criado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* URA Creation Dialog */}
        <Dialog open={uraOpen} onOpenChange={setUraOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Campanha URA</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUra} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Nome da Campanha</Label>
                <Input value={uraName} onChange={(e) => setUraName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Conexão WhatsApp (Origem)</Label>
                  <Select value={uraSessionId} onValueChange={setUraSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Fluxo URA (Outbound)</Label>
                  <Select value={uraFlowId} onValueChange={setUraFlowId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {flows.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Intervalo entre Ligações (Segundos)</Label>
                <Input type="number" value={uraDelay} onChange={(e) => setUraDelay(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Telefones dos Clientes (Um por linha)</Label>
                <Textarea
                  value={uraPhones}
                  onChange={(e) => setUraPhones(e.target.value)}
                  placeholder="5511999999999&#10;5511888888888"
                  rows={6}
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setUraOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("actions.create")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Broadcast Creation Dialog */}
        <Dialog open={bcOpen} onOpenChange={setBcOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Disparo em Massa (Broadcast)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBc} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Nome do Disparo</Label>
                <Input value={bcName} onChange={(e) => setBcName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Conexão WhatsApp (Origem)</Label>
                  <Select value={bcSessionId} onValueChange={setBcSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Intervalo entre Disparos (Segundos)</Label>
                  <Input type="number" value={bcDelay} onChange={(e) => setBcDelay(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Texto da Mensagem (Suporta {"{{name}}"})</Label>
                <Textarea
                  value={bcMessage}
                  onChange={(e) => setBcMessage(e.target.value)}
                  placeholder="Olá {{name}}, tudo bem? Confirme seu agendamento..."
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Lista de Contatos (Telefone,Nome - Um por linha)</Label>
                <Textarea
                  value={bcContacts}
                  onChange={(e) => setBcContacts(e.target.value)}
                  placeholder="5511999999999,Raphael&#10;5511888888888,Elis"
                  rows={6}
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setBcOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("actions.create")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
          title="Excluir campanha?"
          description="Esta ação removerá a campanha e interromperá quaisquer disparos agendados em andamento."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
