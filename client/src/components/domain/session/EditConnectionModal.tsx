import { useEffect, useState } from "react";
import { Loader2, Smartphone, Users2, Settings, MessageSquare, Heart } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSession } from "@/services/sessions";
import { listQueues } from "@/services/queues";
import { listFlows } from "@/services/flows";
import type { SessionInfo } from "@/types/session";
import type { Queue } from "@/types/queue";
import type { FlowRow } from "@/types/flow";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionInfo;
  onSaved?: () => void;
};

export const EditConnectionModal = ({ open, onOpenChange, session, onSaved }: Props) => {
  const [name, setName] = useState(session.name);
  const [color, setColor] = useState(session.color ?? "#57adf8");
  const [allowGroups, setAllowGroups] = useState(!!session.allowGroups);
  const [queueId, setQueueId] = useState(session.queueId ?? "");
  const [flowId, setFlowId] = useState(session.flowId ?? "");
  const [chatFlowId, setChatFlowId] = useState(session.chatFlowId ?? "");
  const [greetingMessage, setGreetingMessage] = useState(session.greetingMessage ?? "");
  const [completionMessage, setCompletionMessage] = useState(session.completionMessage ?? "");
  const [outOfHoursMessage, setOutOfHoursMessage] = useState(session.outOfHoursMessage ?? "");
  const [surveyEnabled, setSurveyEnabled] = useState(!!session.surveyEnabled);
  const [surveyPrompt, setSurveyPrompt] = useState(session.surveyPrompt ?? "");

  const [queues, setQueues] = useState<Queue[]>([]);
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(session.name);
    setColor(session.color ?? "#57adf8");
    setAllowGroups(!!session.allowGroups);
    setQueueId(session.queueId ?? "");
    setFlowId(session.flowId ?? "");
    setChatFlowId(session.chatFlowId ?? "");
    setGreetingMessage(session.greetingMessage ?? "");
    setCompletionMessage(session.completionMessage ?? "");
    setOutOfHoursMessage(session.outOfHoursMessage ?? "");
    setSurveyEnabled(!!session.surveyEnabled);
    setSurveyPrompt(session.surveyPrompt ?? "");

    void listQueues().then(setQueues).catch(() => {});
    void listFlows().then(setFlows).catch(() => {});
  }, [open, session]);

  const onSave = async () => {
    if (!name.trim()) {
      toast.error("Nome da conexão é obrigatório");
      return;
    }
    setBusy(true);
    try {
      await updateSession(session.id, {
        name: name.trim(),
        color,
        isDefault: !!session.isDefault,
        allowGroups,
        queueId,
        redirectMinutes: session.redirectMinutes ?? 0,
        flowId,
        chatFlowId,
        greetingMessage,
        completionMessage,
        outOfHoursMessage,
        surveyEnabled,
        surveyPrompt,
      });
      toast.success("Conexão atualizada");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm font-semibold">Editar conexão</DialogTitle>
              <p className="truncate text-xs text-muted-foreground">{session.jid || "Aguardando pareamento"}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-3 w-full border-b rounded-none bg-transparent h-auto p-0 gap-4">
              <TabsTrigger
                value="general"
                className="flex items-center justify-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none pb-2 text-xs font-semibold"
              >
                <Settings className="h-3.5 w-3.5" />
                Geral
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="flex items-center justify-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none pb-2 text-xs font-semibold"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Mensagens
              </TabsTrigger>
              <TabsTrigger
                value="survey"
                className="flex items-center justify-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none pb-2 text-xs font-semibold"
              >
                <Heart className="h-3.5 w-3.5" />
                Pesquisa (CSAT)
              </TabsTrigger>
            </TabsList>

            {/* TAB: General configs */}
            <TabsContent value="general" className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome da Conexão</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Cor de Exibição</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer p-1"
                    />
                    <span className="text-muted-foreground uppercase">{color}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="cqueue">Fila vinculada</Label>
                  <select
                    id="cqueue"
                    value={queueId}
                    onChange={(e) => setQueueId(e.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="">— Sem fila —</option>
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cgroups">Mensagens de Grupo</Label>
                  <div className="flex items-center justify-between h-8 border rounded-md px-3 bg-muted/20">
                    <span className="text-muted-foreground">Receber mensagens</span>
                    <Switch checked={allowGroups} onCheckedChange={setAllowGroups} id="cgroups" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-1">
                  <Label htmlFor="cvoiceflow">Fluxo de Voz (URA)</Label>
                  <select
                    id="cvoiceflow"
                    value={flowId}
                    onChange={(e) => setFlowId(e.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="">— Sem fluxo de voz —</option>
                    {flows.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cchatflow">Fluxo de Chat (WhatsApp)</Label>
                  <select
                    id="cchatflow"
                    value={chatFlowId}
                    onChange={(e) => setChatFlowId(e.target.value)}
                    className="h-8 w-full rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="">— Sem fluxo de chat —</option>
                    {flows.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Message Settings */}
            <TabsContent value="messages" className="space-y-4 pt-4 text-xs">
              <div className="space-y-1">
                <Label>Mensagem de Saudação</Label>
                <Textarea
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Enviada no primeiro contato do cliente..."
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label>Mensagem de Encerramento</Label>
                <Textarea
                  value={completionMessage}
                  onChange={(e) => setCompletionMessage(e.target.value)}
                  placeholder="Enviada quando o ticket é finalizado..."
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label>Mensagem de Fora de Horário</Label>
                <Textarea
                  value={outOfHoursMessage}
                  onChange={(e) => setOutOfHoursMessage(e.target.value)}
                  placeholder="Enviada se o contato ocorrer fora do expediente..."
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* TAB: Satisfying Survey (CSAT) */}
            <TabsContent value="survey" className="space-y-4 pt-4 text-xs">
              <div className="flex items-center justify-between rounded-lg border bg-muted/10 p-3">
                <div className="space-y-0.5">
                  <Label className="font-semibold text-sm">Pesquisa de Satisfação (CSAT)</Label>
                  <p className="text-muted-foreground text-[10px]">
                    Dispara automaticamente uma avaliação de satisfação (1 a 5 estrelas) ao finalizar um chat.
                  </p>
                </div>
                <Switch checked={surveyEnabled} onCheckedChange={setSurveyEnabled} />
              </div>

              {surveyEnabled && (
                <div className="space-y-1">
                  <Label>Instrução de Avaliação (Survey Prompt)</Label>
                  <Textarea
                    value={surveyPrompt}
                    onChange={(e) => setSurveyPrompt(e.target.value)}
                    placeholder="Ex: Por favor, avalie nosso atendimento de 1 a 5..."
                    rows={3}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/20 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
