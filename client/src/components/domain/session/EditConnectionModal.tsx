import { useEffect, useState } from "react";
import { Loader2, Smartphone, Users2, Webhook, MessageSquare, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [activeTab, setActiveTab] = useState<"general" | "chatwoot" | "webhook">("general");
  const [allowGroups, setAllowGroups] = useState(!!session.allowGroups);
  const [queueId, setQueueId] = useState(session.queueId ?? "");
  const [queues, setQueues] = useState<Queue[]>([]);
  const [flowId, setFlowId] = useState(session.flowId ?? "");
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [busy, setBusy] = useState(false);

  // Chatwoot state
  const [chatwootEnabled, setChatwootEnabled] = useState(!!session.chatwootEnabled);
  const [chatwootUrl, setChatwootUrl] = useState(session.chatwootUrl ?? "");
  const [chatwootToken, setChatwootToken] = useState(session.chatwootToken ?? "");
  const [chatwootAccountId, setChatwootAccountId] = useState(session.chatwootAccountId ?? "");
  const [chatwootInboxId, setChatwootInboxId] = useState(session.chatwootInboxId ?? "");

  // Webhook state
  const [webhookEnabled, setWebhookEnabled] = useState(!!session.webhookEnabled);
  const [webhookUrl, setWebhookUrl] = useState(session.webhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState(session.webhookSecret ?? "");

  useEffect(() => {
    if (!open) return;
    setAllowGroups(!!session.allowGroups);
    setQueueId(session.queueId ?? "");
    setFlowId(session.flowId ?? "");
    setChatwootEnabled(!!session.chatwootEnabled);
    setChatwootUrl(session.chatwootUrl ?? "");
    setChatwootToken(session.chatwootToken ?? "");
    setChatwootAccountId(session.chatwootAccountId ?? "");
    setChatwootInboxId(session.chatwootInboxId ?? "");
    setWebhookEnabled(!!session.webhookEnabled);
    setWebhookUrl(session.webhookUrl ?? "");
    setWebhookSecret(session.webhookSecret ?? "");
    setActiveTab("general");
    void listQueues().then(setQueues).catch(() => {});
    void listFlows().then(setFlows).catch(() => {});
  }, [open, session]);

  const onSave = async () => {
    if (chatwootEnabled && (!chatwootUrl || !chatwootToken || !chatwootAccountId || !chatwootInboxId)) {
      toast.error("Por favor, preencha todos os campos do Chatwoot.");
      return;
    }
    if (webhookEnabled && !webhookUrl) {
      toast.error("Por favor, informe a URL de destino do Webhook.");
      return;
    }

    setBusy(true);
    try {
      await updateSession(session.id, {
        name: session.name,
        color: session.color ?? "#57adf8",
        isDefault: !!session.isDefault,
        allowGroups,
        queueId,
        redirectMinutes: session.redirectMinutes ?? 0,
        flowId,
        greetingMessage: session.greetingMessage ?? "",
        completionMessage: session.completionMessage ?? "",
        outOfHoursMessage: session.outOfHoursMessage ?? "",
        surveyEnabled: !!session.surveyEnabled,
        surveyPrompt: session.surveyPrompt ?? "",
        chatwootEnabled,
        chatwootUrl,
        chatwootToken,
        chatwootAccountId,
        chatwootInboxId,
        webhookEnabled,
        webhookUrl,
        webhookSecret,
      });
      toast.success("Conexão atualizada com sucesso");
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
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">Editar conexão</DialogTitle>
              <p className="truncate text-xs text-muted-foreground">{session.jid || "Aguardando pareamento"}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex border-b bg-muted/20 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-center border-b-2 transition ${
              activeTab === "general"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings2 className="h-4 w-4" />
            Geral
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chatwoot")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-center border-b-2 transition ${
              activeTab === "chatwoot"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Chatwoot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("webhook")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-center border-b-2 transition ${
              activeTab === "webhook"
                ? "border-primary text-primary bg-background/50"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Webhook className="h-4 w-4" />
            Webhook
          </button>
        </div>

        <div className="max-h-[350px] overflow-y-auto px-6 py-5 space-y-5">
          {activeTab === "general" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cqueue">Fila vinculada</Label>
                <select
                  id="cqueue"
                  value={queueId}
                  onChange={(e) => setQueueId(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">— Sem fila —</option>
                  {queues.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Novas conversas são direcionadas para esta fila.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cflow">Fluxo de URA (Voz)</Label>
                <select
                  id="cflow"
                  value={flowId}
                  onChange={(e) => setFlowId(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">— Sem fluxo (rejeitar/ignorar chamadas) —</option>
                  {flows
                    .filter((f) => f.enabled)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.trigger !== "inbound" ? `(${f.trigger})` : ""}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Selecione o fluxo (URA) para atender ligações. Somente fluxos ativados são listados.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                    <Users2 className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium">Receber mensagens de grupo</div>
                    <div className="text-xs text-muted-foreground leading-snug">
                      Quando desativado, mensagens de grupos são ignoradas.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={allowGroups}
                  onClick={() => setAllowGroups((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    allowGroups ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      allowGroups ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {activeTab === "chatwoot" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">Habilitar Chatwoot</div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Sincronizar conversas com o painel do Chatwoot.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={chatwootEnabled}
                  onClick={() => setChatwootEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    chatwootEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      chatwootEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {chatwootEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cw-url">URL da API do Chatwoot</Label>
                    <Input
                      id="cw-url"
                      type="url"
                      placeholder="Ex: https://chat.meudominio.com"
                      value={chatwootUrl}
                      onChange={(e) => setChatwootUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cw-token">Token de Acesso (API Access Token)</Label>
                    <Input
                      id="cw-token"
                      type="password"
                      placeholder="Cole o token de acesso da conta"
                      value={chatwootToken}
                      onChange={(e) => setChatwootToken(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cw-account">ID da Conta</Label>
                      <Input
                        id="cw-account"
                        type="text"
                        placeholder="Ex: 1"
                        value={chatwootAccountId}
                        onChange={(e) => setChatwootAccountId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cw-inbox">ID da Inbox</Label>
                      <Input
                        id="cw-inbox"
                        type="text"
                        placeholder="Ex: 15"
                        value={chatwootInboxId}
                        onChange={(e) => setChatwootInboxId(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "webhook" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">Habilitar Webhook</div>
                  <div className="text-xs text-muted-foreground leading-snug">
                    Disparar eventos de mensagens e ligações.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={webhookEnabled}
                  onClick={() => setWebhookEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    webhookEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      webhookEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {webhookEnabled && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="wh-url">URL de Destino (Webhook URL)</Label>
                    <Input
                      id="wh-url"
                      type="url"
                      placeholder="Ex: https://meusistema.com.br/api/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wh-secret">Chave Secreta (Signature Secret - Opcional)</Label>
                    <Input
                      id="wh-secret"
                      type="text"
                      placeholder="Chave para assinatura HMAC-SHA256"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Enviada no cabeçalho `X-AstraCalls-Signature` para autenticar a origem do disparo.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
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
