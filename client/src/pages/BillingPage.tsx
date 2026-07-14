import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, ShieldAlert, CheckCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as billingApi from "@/services/billing";
import * as settingsApi from "@/services/settings";

export default function BillingPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [sub, setSub] = useState<billingApi.Subscription | null>(null);
  const [freeTier, setFreeTier] = useState<billingApi.FreeTierStatus | null>(null);
  const [limits, setLimits] = useState<billingApi.FreeTierLimits | null>(null);
  const [planUsage, setPlanUsage] = useState<settingsApi.PlanUsage | null>(null);

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [instancesQuantity, setInstancesQuantity] = useState(2);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const [subData, freeData, limitData, planUsageData] = await Promise.all([
        billingApi.getSubscription().catch(() => null),
        billingApi.getFreeTier().catch(() => null),
        billingApi.getFreeTierLimits().catch(() => null),
        settingsApi.getPlanUsage().catch(() => null),
      ]);
      setSub(subData);
      setFreeTier(freeData);
      setLimits(limitData);
      setPlanUsage(planUsageData);
      if (subData) {
        setInstancesQuantity(subData.quantity || 2);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBilling();
    // Stripe checkout callback alerts
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast.success("Assinatura efetuada com sucesso!");
    }
    const status = searchParams.get("status");
    if (status === "cancel") {
      toast.error("O pagamento foi cancelado.");
    }
  }, [searchParams]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);
    try {
      const res = await billingApi.createCheckout(instancesQuantity);
      if (res.url) {
        window.location.href = res.url; // Redirect to Stripe checkout page
      } else {
        toast.error("URL de pagamento não gerada.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getPercentage = (used: number, limit: number) => {
    if (!limit) return 0;
    return Math.min(Math.round((used / limit) * 100), 100);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Faturamento e Cobrança</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assine um plano comercial para liberar conexões e minutos ilimitados no seu WaCalls.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 pb-6">
            {/* LEFT COLUMN: Active Plan Status */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Status do Plano</h3>
                    <p className="text-xs text-muted-foreground">
                      {sub && sub.status === "active" ? "Plano Profissional Ativo" : "Nenhum plano ativo"}
                    </p>
                  </div>
                </div>

                {freeTier && !freeTier.paid && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Modo Gratuito (Free Tier)</h4>
                      <p className="mt-0.5">
                        Você está no plano de testes. Existem limites de conexões simultâneas e ligações por semana.
                      </p>
                    </div>
                  </div>
                )}

                {sub && sub.status === "active" ? (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-800 dark:text-green-400 p-3 rounded-lg flex items-start gap-2 text-xs">
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold">Plano Ilimitado</h4>
                      <p className="mt-0.5">
                        Assinatura ativa para {sub.quantity} conexões. Ligações e mensagens ilimitadas!
                      </p>
                      {sub.currentPeriodEnd > 0 && (
                        <p className="mt-1 font-medium">
                          Próxima renovação: {new Date(sub.currentPeriodEnd * 1000).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Assine conexões ilimitadas para atendimento e campanhas. Cancele quando quiser.
                    </p>
                  </div>
                )}
              </div>

              {/* Free Tier limits usage progress */}
              {freeTier && !freeTier.paid && (
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="font-semibold text-sm">Consumo da Semana</h3>
                  
                  {/* Connections limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Conexões WhatsApp</span>
                      <span>
                        {freeTier.connectionsUsed} / {freeTier.connections}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${getPercentage(freeTier.connectionsUsed, freeTier.connections)}%` }}
                      />
                    </div>
                  </div>

                  {/* Calls limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Ligações efetuadas</span>
                      <span>
                        {freeTier.callsUsed} / {freeTier.callsLimit}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${getPercentage(freeTier.callsUsed, freeTier.callsLimit)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Plan limits usage progress */}
              {planUsage && (
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <h3 className="font-semibold text-sm">Limites e Recursos do Plano</h3>
                  
                  {/* Users limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Operadores Ativos</span>
                      <span>
                        {planUsage.usage.usuarios} / {planUsage.limits.usuarios === 0 ? "∞" : planUsage.limits.usuarios}
                      </span>
                    </div>
                    {planUsage.limits.usuarios > 0 ? (
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${getPercentage(planUsage.usage.usuarios, planUsage.limits.usuarios)}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-semibold">Sem limite de operadores</p>
                    )}
                  </div>

                  {/* Connections limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Conexões WhatsApp</span>
                      <span>
                        {planUsage.usage.conexoes} / {planUsage.limits.conexoes === 0 ? "∞" : planUsage.limits.conexoes}
                      </span>
                    </div>
                    {planUsage.limits.conexoes > 0 ? (
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${getPercentage(planUsage.usage.conexoes, planUsage.limits.conexoes)}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-semibold">Sem limite de conexões</p>
                    )}
                  </div>

                  {/* Queues limit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Filas de Atendimento</span>
                      <span>
                        {planUsage.usage.filas} / {planUsage.limits.filas === 0 ? "∞" : planUsage.limits.filas}
                      </span>
                    </div>
                    {planUsage.limits.filas > 0 ? (
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${getPercentage(planUsage.usage.filas, planUsage.limits.filas)}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-semibold">Sem limite de filas</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Upgrade / Stripe checkout */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Sparkles className="h-4 w-4" />
                  <span>Contratar Conexões</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="qty">Número de Instâncias WhatsApp desejadas</Label>
                    <Input
                      id="qty"
                      type="number"
                      min="1"
                      max="100"
                      value={instancesQuantity}
                      onChange={(e) => setInstancesQuantity(Number(e.target.value))}
                      className="text-sm font-medium"
                      required
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    A cobrança é realizada de forma recorrente por conexão ativa.
                  </p>

                  <Button
                    type="submit"
                    disabled={checkoutLoading}
                    className="w-full text-xs h-9 justify-center"
                  >
                    {checkoutLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                    )}
                    Ir para Pagamento (Stripe)
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
