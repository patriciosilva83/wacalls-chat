import { useEffect, useState } from "react";
import { X, Loader2, Code2, Clipboard, ShieldCheck, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCloudConfig, enableCloud, disableCloud, type CloudConfig } from "@/services/sessions";
import type { SessionInfo } from "@/types/session";

export function CloudConfigDialog({
  open,
  onOpenChange,
  session,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: SessionInfo;
  onUpdated?: () => void;
}) {
  const [config, setConfig] = useState<CloudConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form inputs
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [token, setToken] = useState("");
  const [appSecret, setAppSecret] = useState("");

  const loadConfig = async () => {
    setLoading(true);
    try {
      const cfg = await getCloudConfig(session.id);
      setConfig(cfg);
      setPhoneId(cfg.phoneId || "");
      setWabaId(cfg.wabaId || "");
      setToken(""); // Always empty for input unless edited
      setAppSecret("");
    } catch (e) {
      toast.error("Falha ao carregar configurações: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadConfig();
  }, [open, session.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneId.trim()) {
      toast.error("Phone ID é obrigatório");
      return;
    }
    // Token is required on first enable
    if (!config?.hasToken && !token.trim()) {
      toast.error("Token de Acesso é obrigatório para ativação");
      return;
    }

    setSaving(true);
    try {
      const res = await enableCloud(session.id, {
        phoneId: phoneId.trim(),
        wabaId: wabaId.trim(),
        token: token.trim(), // Backend retains existing token if empty
        appSecret: appSecret.trim() || undefined,
      });
      toast.success("API Oficial ativada com sucesso!");
      void loadConfig();
      onUpdated?.();
    } catch (e) {
      toast.error("Falha ao salvar credenciais: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm("Deseja mesmo desativar a API Oficial e voltar para o escaneamento de QR Code?")) return;
    setSaving(true);
    try {
      await disableCloud(session.id);
      toast.success("API Oficial desativada. Revertido para QR Code.");
      void loadConfig();
      onUpdated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0 text-xs">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Code2 className="h-5 w-5 text-indigo-500" />
            WhatsApp API Oficial
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            {config?.mode !== "cloud" ? (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  Conecte via API Oficial da Meta
                </div>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Evite bloqueios e quedas de conexões usando o WhatsApp Cloud API oficial da Meta. Requer criar um aplicativo no portal Meta for Developers.
                </p>
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    onClick={() => {
                      if (config) setConfig({ ...config, mode: "cloud" });
                    }}
                  >
                    Configurar API Oficial
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Phone ID (Identificador de Telefone)</Label>
                    <Input
                      value={phoneId}
                      onChange={(e) => setPhoneId(e.target.value)}
                      placeholder="ex: 1092834710293"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>WABA ID (ID da Conta Business)</Label>
                    <Input
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      placeholder="ex: 1283749102834"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Token de Acesso (Meta Graph API)</Label>
                  <Input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={config.hasToken ? "•••••••••••• (Já configurado, digite para alterar)" : "Digite o token de acesso temporário ou permanente..."}
                    required={!config.hasToken}
                  />
                </div>

                <div className="space-y-1">
                  <Label>App Secret (Segredo do App Meta - Opcional)</Label>
                  <Input
                    type="password"
                    value={appSecret}
                    onChange={(e) => setAppSecret(e.target.value)}
                    placeholder={config.hasAppSecret ? "•••••••••••• (Já configurado)" : "Opcional para verificação de assinaturas..."}
                  />
                </div>

                {config.verifyToken && (
                  <div className="space-y-3 border-t pt-3 mt-1 bg-muted/20 p-3 rounded-lg border">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <HelpCircle className="h-4 w-4" />
                      Configure a Meta Webhook
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Copie os dados abaixo e cole na configuração de Webhook do WhatsApp no painel da Meta:
                    </p>
                    <div className="space-y-2 text-[10px]">
                      <div>
                        <div className="text-muted-foreground font-semibold mb-0.5">Callback/Webhook URL</div>
                        <div className="flex gap-2 items-center bg-background p-1.5 border rounded font-mono truncate">
                          <span className="flex-1 truncate">{config.webhookUrl}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(config.webhookUrl, "Webhook URL")}
                          >
                            <Clipboard className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground font-semibold mb-0.5">Verify Token</div>
                        <div className="flex gap-2 items-center bg-background p-1.5 border rounded font-mono truncate">
                          <span className="flex-1 truncate">{config.verifyToken}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(config.verifyToken, "Verify Token")}
                          >
                            <Clipboard className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t pt-3 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                    onClick={handleDisable}
                    disabled={saving}
                  >
                    Desativar API
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Salvar Credenciais
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
