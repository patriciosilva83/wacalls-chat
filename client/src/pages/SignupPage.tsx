import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bot, Mail, Lock, Building, CreditCard, ArrowRight, Loader2, Key } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/auth";

export function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cpf, setCpf] = useState("");

  // Verification step states
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [devCodeHint, setDevCodeHint] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !companyName.trim() || !cpf.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const res = await useAuth.getState().signup({
        email,
        password,
        companyName,
        cpf,
      });

      if ("needsVerification" in res && res.needsVerification) {
        setNeedsVerify(true);
        if (res.devCode) {
          setDevCodeHint(res.devCode); // Dev verification code helper
        }
        toast.info("Código de verificação enviado para seu e-mail.");
      } else {
        toast.success("Cadastro efetuado com sucesso!");
        navigate("/chats");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setLoading(true);
    try {
      await useAuth.getState().verifyEmail(email, verifyCode);
      toast.success("E-mail verificado com sucesso!");
      navigate("/chats");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient blur background */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground mb-3 shadow-md">
            <Bot className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {needsVerify ? "Verifique seu e-mail" : t("auth.createAccount")}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground max-w-xs">
            {needsVerify
              ? `Enviamos um código de segurança de 6 dígitos para o endereço ${email}`
              : "Preencha as informações abaixo para iniciar o seu período de testes."}
          </p>
        </div>

        <div className="bg-card border shadow-sm rounded-2xl p-6 space-y-6">
          {!needsVerify ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                    placeholder="nome@empresa.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-sm"
                    placeholder="Sua senha de acesso"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-9 text-sm"
                    placeholder="Ex: Ponto do Software Ltda"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpf">CPF / CNPJ</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="pl-9 text-sm"
                    placeholder="Apenas números"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs justify-center h-10 mt-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-1" />
                )}
                {t("auth.signup")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="code">Código de Verificação</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    className="pl-9 text-sm text-center tracking-widest font-semibold"
                    placeholder="123456"
                    required
                  />
                </div>
              </div>

              {devCodeHint && (
                <div className="bg-muted p-3 rounded-lg text-center border text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Código de desenvolvimento:</span>{" "}
                  <code className="bg-background px-1.5 py-0.5 rounded font-mono border">
                    {devCodeHint}
                  </code>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full text-xs justify-center h-10 mt-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Confirmar Código
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              {needsVerify ? (
                <button
                  type="button"
                  onClick={() => setNeedsVerify(false)}
                  className="font-medium text-primary hover:underline"
                >
                  Voltar ao cadastro
                </button>
              ) : (
                <>
                  Já possui uma conta?{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    {t("auth.signin")}
                  </Link>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
