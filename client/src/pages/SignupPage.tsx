import { useEffect, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  PhoneCall,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  FileText,
  Sparkles,
} from "lucide-react";
import { signup } from "@/services/auth";
import { useAuth } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readCachedWhitelabel, subscribeWhitelabel } from "@/lib/whitelabel";
import * as settingsApi from "@/services/settings";

export const SignupPage = () => {
  const user = useAuth((s) => s.user);
  const loading = useAuth((s) => s.loading);
  const refresh = useAuth((s) => s.refresh);
  
  const [wl, setWl] = useState<settingsApi.Whitelabel | null>(
    () => (readCachedWhitelabel() as settingsApi.Whitelabel | null) ?? null,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cpf, setCpf] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let alive = true;
    settingsApi
      .getWhitelabel()
      .then((v) => {
        if (!alive) return;
        setWl((prev) => ({ ...(prev || {}), ...v } as settingsApi.Whitelabel));
      })
      .catch(() => {});
    const off = subscribeWhitelabel((v) => setWl(v));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const brandName = wl?.appName || "Ponto do Software";
  const brandLogo = wl?.logoLight || wl?.logoDark || "/logo.png";

  if (user) return <Navigate to="/chats" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !companyName || !cpf) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    
    // Sanitize CPF/CNPJ to be alphanumeric
    const cleanCpf = cpf.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      toast.error("O documento deve ser um CPF (11 dígitos) ou CNPJ (14 caracteres).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signup({
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        cpf: cleanCpf,
      });

      if (res.needsVerification) {
        toast.success("Conta criada! Por favor, ative sua conta.");
        navigate("/login", { replace: true });
      } else {
        toast.success("Conta criada com sucesso! Faça seu login.");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Falha ao criar conta", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <div className="mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* Brand / marketing panel */}
        <aside className="relative hidden overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/90 via-emerald-500/80 to-teal-600/90 p-10 text-primary-foreground shadow-2xl lg:flex lg:h-[640px] lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_40%),radial-gradient(circle_at_80%_60%,white_0,transparent_35%)]" />

          <div className="relative z-10 flex items-center gap-3">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="h-11 w-auto max-w-[150px] object-contain rounded-xl" />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
                <PhoneCall className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-lg font-semibold tracking-tight">{brandName}</p>
              <p className="text-xs opacity-80">Atendimento &amp; chamadas em um só lugar</p>
            </div>
          </div>

          <div className="relative z-10 space-y-5">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              Crie sua conta agora — <span className="opacity-80">e centralize todo o atendimento em uma única tela.</span>
            </h2>
            <p className="text-sm opacity-90 max-w-md">
              Tenha múltiplos números de WhatsApp conectados, distribuição por filas, relatórios detalhados e agentes eficientes para alavancar a produtividade da sua equipe.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-xs opacity-80">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{brandName} — Gratuito</span>
          </div>
        </aside>

        {/* Signup card */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border bg-card/80 p-8 shadow-xl backdrop-blur-xl">
            <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
              {brandLogo ? (
                <img src={brandLogo} alt={brandName} className="h-14 w-auto max-w-[180px] object-contain rounded-2xl" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                  <PhoneCall className="h-6 w-6" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{brandName}</h1>
                <p className="text-sm text-muted-foreground">Cadastre sua empresa</p>
              </div>
            </div>

            <div className="mb-6 hidden text-center lg:block">
              <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Insira as informações da sua empresa para começar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="h-11 pl-9"
                    placeholder="Minha Empresa Ltda"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF ou CNPJ (apenas letras e números)</Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    required
                    className="h-11 pl-9"
                    placeholder="CPF ou CNPJ Alfanumérico"
                    maxLength={18}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 pl-9"
                    placeholder="voce@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pl-9 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full text-base font-medium shadow-lg shadow-primary/20"
                disabled={submitting || loading}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm">
              Já tem uma conta?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Ao se cadastrar, você concorda com os Termos de uso e a Política de privacidade.
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {brandName} · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
