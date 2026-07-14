import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Settings,
  Mail,
  Palette,
  Briefcase,
  Key,
  Plus,
  Trash2,
  Edit2,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import type { Plan, Options, SmtpConfig, Whitelabel, GoogleOAuthAdmin } from "@/services/settings";
import * as settingsApi from "@/services/settings";
import * as billingApi from "@/services/billing";

export function AdminCompaniesPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States for configs
  const [plans, setPlans] = useState<Plan[]>([]);
  const [options, setOptions] = useState<Options | null>(null);
  const [smtp, setSmtp] = useState<SmtpConfig | null>(null);
  const [whitelabel, setWhitelabel] = useState<Whitelabel | null>(null);
  const [oauth, setOauth] = useState<GoogleOAuthAdmin | null>(null);
  const [freeLimits, setFreeLimits] = useState<billingApi.FreeTierLimits | null>(null);
  const [savingFreeLimits, setSavingFreeLimits] = useState(false);

  // Plan Dialog States
  const [planOpen, setPlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  // SMTP Test States
  const [smtpTestOpen, setSmtpTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testingSmtp, setTestingSmtp] = useState(false);

  // Plan Form State
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState(0);
  const [planUsers, setPlanUsers] = useState(5);
  const [planConns, setPlanConns] = useState(2);
  const [planQueues, setPlanQueues] = useState(2);
  const [planPeriod, setPlanPeriod] = useState<"mensal" | "trimestral" | "semestral" | "anual">("mensal");
  const [planPublic, setPlanPublic] = useState(true);
  const [planTrial, setPlanTrial] = useState(false);
  const [planTrialDays, setPlanTrialDays] = useState(7);

  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [pList, optsData, smtpData, wlData, oauthData, limitsData] = await Promise.all([
        settingsApi.listPlans().catch(() => []),
        settingsApi.getOptions().catch(() => null),
        settingsApi.getSMTP().catch(() => null),
        settingsApi.getWhitelabel().catch(() => null),
        settingsApi.getGoogleOAuth().catch(() => null),
        billingApi.getFreeTierLimits().catch(() => null),
      ]);
      setPlans(pList);
      setOptions(optsData);
      setSmtp(smtpData);
      setWhitelabel(wlData);
      setOauth(oauthData);
      setFreeLimits(limitsData);
    } catch (e) {
      toast.error("Erro ao carregar configurações: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAllSettings();
  }, []);

  // ----- Plan Handlers -----
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    const payload: Plan = {
      id: editingPlan?.id || "",
      nome: planName,
      valor: Number(planPrice),
      usuarios: Number(planUsers),
      conexoes: Number(planConns),
      filas: Number(planQueues),
      periodo: planPeriod,
      publico: planPublic,
      trial: planTrial,
      diasTrial: Number(planTrialDays),
      ativo: true,
      recursos: editingPlan?.recursos || {},
    };

    setSaving(true);
    try {
      const saved = await settingsApi.savePlan(payload);
      if (editingPlan) {
        setPlans(plans.map((p) => (p.id === editingPlan.id ? saved : p)));
      } else {
        setPlans([...plans, saved]);
      }
      setPlanOpen(false);
      toast.success(t("common.save"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddPlan = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanPrice(0);
    setPlanUsers(5);
    setPlanConns(2);
    setPlanQueues(2);
    setPlanPeriod("mensal");
    setPlanPublic(true);
    setPlanTrial(false);
    setPlanTrialDays(7);
    setPlanOpen(true);
  };

  const handleOpenEditPlan = (p: Plan) => {
    setEditingPlan(p);
    setPlanName(p.nome);
    setPlanPrice(p.valor);
    setPlanUsers(p.usuarios);
    setPlanConns(p.conexoes);
    setPlanQueues(p.filas);
    setPlanPeriod(p.periodo || "mensal");
    setPlanPublic(p.publico);
    setPlanTrial(p.trial);
    setPlanTrialDays(p.diasTrial);
    setPlanOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!deletingPlanId) return;
    try {
      await settingsApi.deletePlan(deletingPlanId);
      setPlans(plans.filter((p) => p.id !== deletingPlanId));
      toast.success(t("campaigns.toastDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingPlanId(null);
    }
  };

  // ----- General Options Handlers -----
  const handleSaveOptions = async (updated: Partial<Options>) => {
    if (!options) return;
    const next = { ...options, ...updated };
    setOptions(next);
    try {
      await settingsApi.saveOptions(next);
      toast.success("Opções salvas");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ----- SMTP Config Handlers -----
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtp) return;
    setSaving(true);
    try {
      await settingsApi.saveSMTP(smtp);
      toast.success("SMTP salvo com sucesso!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setTestingSmtp(true);
    try {
      const res = await settingsApi.testSMTP(testEmail);
      if (res.ok) {
        toast.success("E-mail de teste enviado!");
        setSmtpTestOpen(false);
      } else {
        toast.error(res.message || "Erro no envio.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTestingSmtp(false);
    }
  };

  // ----- White Label Handlers -----
  const handleSaveWhitelabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitelabel) return;
    setSaving(true);
    try {
      await settingsApi.saveWhitelabel(whitelabel);
      toast.success("Configurações visuais salvas!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (kind: keyof Whitelabel, file: File) => {
    try {
      const res = await settingsApi.uploadWhitelabelAsset(kind, file);
      if (whitelabel) {
        setWhitelabel({ ...whitelabel, [kind]: res.url });
      }
      toast.success("Upload realizado!");
    } catch (e) {
      toast.error("Upload falhou: " + (e as Error).message);
    }
  };

  // ----- Google OAuth Handlers -----
  const handleSaveOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauth) return;
    setSaving(true);
    try {
      await settingsApi.saveGoogleOAuth({
        enabled: oauth.enabled,
        clientId: oauth.clientId,
        redirectUri: oauth.redirectUri,
      });
      toast.success("Configuração Google OAuth salva!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Configurações Gerais</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Administração de planos comerciais, e-mail SMTP, chaves Google OAuth e aparência visual do sistema (WhiteLabel).
            </p>
          </div>
          <Button size="sm" onClick={loadAllSettings} variant="outline" className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center shrink-0">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="plans" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex flex-wrap w-full border-b bg-transparent justify-start gap-1 p-0 shrink-0">
              <TabsTrigger value="plans" className="flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2">
                <Briefcase className="h-4 w-4" />
                Planos
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2">
                <Settings className="h-4 w-4" />
                Opções Gerais
              </TabsTrigger>
              <TabsTrigger value="smtp" className="flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2">
                <Mail className="h-4 w-4" />
                SMTP E-mail
              </TabsTrigger>
              <TabsTrigger value="whitelabel" className="flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2">
                <Palette className="h-4 w-4" />
                Aparência (WhiteLabel)
              </TabsTrigger>
              <TabsTrigger value="oauth" className="flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-2">
                <Key className="h-4 w-4" />
                Google Login
              </TabsTrigger>
            </TabsList>

            {/* TAB: Plans */}
            <TabsContent value="plans" className="flex-1 flex flex-col min-h-0 pt-4">
              <div className="flex justify-between items-center mb-3 shrink-0">
                <h3 className="text-base font-semibold">Tabela de Planos Comerciais</h3>
                <Button size="sm" onClick={handleOpenAddPlan}>
                  <Plus className="h-4 w-4 mr-1" />
                  Novo Plano
                </Button>
              </div>

              <div className="flex-1 border rounded-lg overflow-y-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="p-3 font-semibold text-muted-foreground">Nome</th>
                      <th className="p-3 font-semibold text-muted-foreground">Preço</th>
                      <th className="p-3 font-semibold text-muted-foreground">WhatsApp</th>
                      <th className="p-3 font-semibold text-muted-foreground">Atendentes</th>
                      <th className="p-3 font-semibold text-muted-foreground">Filas</th>
                      <th className="p-3 font-semibold text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/10">
                        <td className="p-3 font-medium text-foreground">{p.nome}</td>
                        <td className="p-3">
                          {p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / {p.periodo || "mensal"}
                        </td>
                        <td className="p-3">{p.conexoes === 0 ? "Ilimitado" : p.conexoes}</td>
                        <td className="p-3">{p.usuarios === 0 ? "Ilimitado" : p.usuarios}</td>
                        <td className="p-3">{p.filas === 0 ? "Ilimitado" : p.filas}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditPlan(p)} className="h-8 w-8 p-0">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingPlanId(p.id)}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: General Options */}
            <TabsContent value="options" className="flex-1 overflow-y-auto pt-4 space-y-6 max-w-xl">
              {options && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Toggles de Recursos do Sistema</h3>
                    
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <Label className="font-semibold text-sm">Pesquisa de Avaliação (CSAT)</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Envia uma pesquisa de avaliação de atendimento ao cliente após encerrar chamadas.
                        </p>
                      </div>
                      <Switch
                        checked={!!options.ratingsEnabled}
                        onCheckedChange={(val) => handleSaveOptions({ ratingsEnabled: val })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <Label className="font-semibold text-sm">Distribuição Aleatória de Leads</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Distribui novos atendimentos aleatoriamente entre operadores livres da fila.
                        </p>
                      </div>
                      <Switch
                        checked={!!options.randomAgentEnabled}
                        onCheckedChange={(val) => handleSaveOptions({ randomAgentEnabled: val })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <Label className="font-semibold text-sm">Motivo de Fechamento Obrigatório</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Exige que o atendente informe por escrito o motivo ao encerrar um ticket.
                        </p>
                      </div>
                      <Switch
                        checked={!!options.requireCloseReason}
                        onCheckedChange={(val) => handleSaveOptions({ requireCloseReason: val })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <Label className="font-semibold text-sm">Transcrição de Mensagens de Áudio</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Habilita o botão para transcrever áudio gravado em texto.
                        </p>
                      </div>
                      <Switch
                        checked={!!options.transcriptionEnabled}
                        onCheckedChange={(val) => handleSaveOptions({ transcriptionEnabled: val })}
                      />
                    </div>

                    <div className="border-t pt-6 space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Limites do Plano Gratuito (Free Tier)</h3>
                        <p className="text-xs text-muted-foreground">
                          Ajuste as quotas de conexões e limites semanais para contas gratuitas.
                        </p>
                      </div>
                      
                      {freeLimits && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setSavingFreeLimits(true);
                            try {
                              await billingApi.saveFreeTierLimits(freeLimits);
                              toast.success("Limites do plano gratuito atualizados!");
                            } catch (err) {
                              toast.error("Erro ao salvar limites: " + (err as Error).message);
                            } finally {
                              setSavingFreeLimits(false);
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <Label>Conexões Zap</Label>
                              <Input
                                type="number"
                                min="0"
                                value={freeLimits.connections}
                                onChange={(e) => setFreeLimits({ ...freeLimits, connections: Number(e.target.value) })}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Ligações / Semana</Label>
                              <Input
                                type="number"
                                min="0"
                                value={freeLimits.callsWeek}
                                onChange={(e) => setFreeLimits({ ...freeLimits, callsWeek: Number(e.target.value) })}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Conversas / Semana</Label>
                              <Input
                                type="number"
                                min="0"
                                value={freeLimits.chatsWeek}
                                onChange={(e) => setFreeLimits({ ...freeLimits, chatsWeek: Number(e.target.value) })}
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2">
                            <Button type="submit" size="sm" disabled={savingFreeLimits}>
                              {savingFreeLimits && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                              Salvar Limites
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: SMTP Config */}
            <TabsContent value="smtp" className="flex-1 overflow-y-auto pt-4 space-y-4 max-w-lg">
              {smtp && (
                <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label>SMTP Host</Label>
                    <Input value={smtp.host || ""} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.gmail.com" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>SMTP Port</Label>
                      <Input value={smtp.port || ""} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" required />
                    </div>
                    <div className="space-y-1">
                      <Label>Remetente (From E-mail)</Label>
                      <Input value={smtp.from || ""} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} placeholder="alertas@meusistema.com" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>SMTP Usuário</Label>
                      <Input value={smtp.user || ""} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} placeholder="alertas@meusistema.com" required />
                    </div>
                    <div className="space-y-1">
                      <Label>SMTP Senha {smtp.passSet && "(Já configurada)"}</Label>
                      <Input type="password" value={smtp.pass || ""} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })} placeholder="••••••••••••" />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setSmtpTestOpen(true)}>
                      Testar Envio
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Salvar SMTP
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* TAB: White Label */}
            <TabsContent value="whitelabel" className="flex-1 overflow-y-auto pt-4 space-y-4 max-w-lg">
              {whitelabel && (
                <form onSubmit={handleSaveWhitelabel} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label>Nome do Aplicativo</Label>
                    <Input value={whitelabel.appName || ""} onChange={(e) => setWhitelabel({ ...whitelabel, appName: e.target.value })} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Cor Primária (Tema Claro)</Label>
                      <Input value={whitelabel.primaryLight || ""} onChange={(e) => setWhitelabel({ ...whitelabel, primaryLight: e.target.value })} placeholder="#3b82f6" />
                    </div>
                    <div className="space-y-1">
                      <Label>Cor Primária (Tema Escuro)</Label>
                      <Input value={whitelabel.primaryDark || ""} onChange={(e) => setWhitelabel({ ...whitelabel, primaryDark: e.target.value })} placeholder="#60a5fa" />
                    </div>
                  </div>

                  {/* Logo assets uploads */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Favicon</Label>
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload("favicon", file);
                      }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Logo do Painel</Label>
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload("logoLight", file);
                      }} />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Salvar White Label
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            {/* TAB: Google Login */}
            <TabsContent value="oauth" className="flex-1 overflow-y-auto pt-4 space-y-4 max-w-lg">
              {oauth && (
                <form onSubmit={handleSaveOAuth} className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <Label className="font-semibold text-sm">Habilitar Google Login</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permite que operadores entrem no sistema utilizando suas contas do Google.
                      </p>
                    </div>
                    <Switch
                      checked={oauth.enabled}
                      onCheckedChange={(val) => setOauth({ ...oauth, enabled: val })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Google Client ID</Label>
                    <Input value={oauth.clientId || ""} onChange={(e) => setOauth({ ...oauth, clientId: e.target.value })} required={oauth.enabled} />
                  </div>

                  <div className="space-y-1">
                    <Label>URI de Redirecionamento (Redirect URI)</Label>
                    <Input value={oauth.redirectUri || ""} onChange={(e) => setOauth({ ...oauth, redirectUri: e.target.value })} required={oauth.enabled} />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                      Salvar OAuth
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Plan Edit/Create Dialog */}
        <Dialog open={planOpen} onOpenChange={setPlanOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? t("actions.edit") : t("actions.create")} Plano Comercial
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSavePlan} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Nome do Plano</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Preço Mensal (BRL)</Label>
                  <Input type="number" value={planPrice} onChange={(e) => setPlanPrice(Number(e.target.value))} required />
                </div>
                <div className="space-y-1">
                  <Label>Periodicidade</Label>
                  <Select value={planPeriod} onValueChange={(val) => setPlanPeriod(val as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Instâncias Zap (0=ilimitado)</Label>
                  <Input type="number" value={planConns} onChange={(e) => setPlanConns(Number(e.target.value))} required />
                </div>
                <div className="space-y-1">
                  <Label>Usuários (0=ilimitado)</Label>
                  <Input type="number" value={planUsers} onChange={(e) => setPlanUsers(Number(e.target.value))} required />
                </div>
                <div className="space-y-1">
                  <Label>Filas (0=ilimitado)</Label>
                  <Input type="number" value={planQueues} onChange={(e) => setPlanQueues(Number(e.target.value))} required />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label>Plano Público (Disponível no Signup/Checkout)</Label>
                <Switch checked={planPublic} onCheckedChange={setPlanPublic} />
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <Label>Possui Período de Testes (Trial)</Label>
                  <p className="text-[10px] text-muted-foreground">Libera o acesso antes de cobrar.</p>
                </div>
                <Switch checked={planTrial} onCheckedChange={setPlanTrial} />
              </div>
              {planTrial && (
                <div className="space-y-1">
                  <Label>Dias de Trial</Label>
                  <Input type="number" value={planTrialDays} onChange={(e) => setPlanTrialDays(Number(e.target.value))} />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setPlanOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* SMTP Test Dialog */}
        <Dialog open={smtpTestOpen} onOpenChange={setSmtpTestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Testar Envio SMTP</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTestSmtp} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>E-mail de Destino</Label>
                <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="meuemail@teste.com" required />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setSmtpTestOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={testingSmtp}>
                  {testingSmtp && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Enviar Teste
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingPlanId}
          onOpenChange={(o) => !o && setDeletingPlanId(null)}
          title="Excluir Plano Comercial?"
          description="Os clientes que usam esse plano comercial não serão afetados imediatamente, mas novas assinaturas não poderão ser contratadas."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDeletePlan}
        />
      </div>
    </AppShell>
  );
}
