import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ShieldCheck, ToggleLeft, ToggleRight, Trash2, UserPlus, Search, Building2, Settings } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as authApi from "@/services/auth";
import type { AuthUser } from "@/types/auth";
import { useAuth } from "@/stores/auth";
import { useTranslation } from "react-i18next";

type FormState = {
  email: string;
  name: string;
  password: string;
  companyName: string;
  cpf: string;
};

const emptyForm: FormState = {
  email: "",
  name: "",
  password: "",
  companyName: "",
  cpf: "",
};

export const AdminCompaniesPage = () => {
  const { t } = useTranslation();
  const me = useAuth((s) => s.user);
  const isSuperAdmin = me?.email.trim().toLowerCase() === "admin@pontodosoftware.shop";
  
  const [companies, setCompanies] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toDelete, setToDelete] = useState<AuthUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // SaaS company features control
  const [editingFeatures, setEditingFeatures] = useState<AuthUser | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const handleEditFeatures = (company: AuthUser) => {
    setEditingFeatures(company);
    const active = company.planFeatures
      ? company.planFeatures.split(",").map((s) => s.trim())
      : ["kanban", "flows", "campaigns", "quick-messages", "announcements", "scheduled-messages", "reports"];
    setSelectedFeatures(active);
  };

  const handleSaveFeatures = async () => {
    if (!editingFeatures) return;
    setSaving(true);
    try {
      const featuresStr = selectedFeatures.join(",");
      await authApi.updateCompanyFeatures(editingFeatures.id, featuresStr);
      toast.success("Recursos da empresa atualizados com sucesso!");
      setCompanies((prev) =>
        prev.map((c) => (c.id === editingFeatures.id ? { ...c, planFeatures: featuresStr } : c))
      );
      setEditingFeatures(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  };

  const reload = async () => {
    setLoading(true);
    try {
      const list = await authApi.listCompanies();
      setCompanies(list);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      void reload();
    }
  }, [isSuperAdmin]);

  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return companies;
    return companies.filter(
      (c) =>
        (c.companyName?.toLowerCase() ?? "").includes(query) ||
        (c.email?.toLowerCase() ?? "").includes(query) ||
        (c.name?.toLowerCase() ?? "").includes(query) ||
        (c.cpf ?? "").includes(query)
    );
  }, [companies, searchQuery]);

  const handleToggleActive = async (company: AuthUser) => {
    const nextActiveState = !company.active;
    try {
      await authApi.setCompanyActive(company.id, nextActiveState);
      toast.success(
        nextActiveState
          ? `Empresa "${company.companyName}" ativada com sucesso!`
          : `Empresa "${company.companyName}" bloqueada com sucesso!`
      );
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, active: nextActiveState } : c))
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.companyName || !form.cpf) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    const cleanCpf = form.cpf.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      toast.error("O documento deve ser um CPF (11 dígitos) ou CNPJ (14 caracteres).");
      return;
    }

    setSaving(true);
    try {
      await authApi.createUser({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim() || undefined,
        companyName: form.companyName.trim(),
        cpf: cleanCpf,
        role: "admin", // O dono da empresa é o admin do seu tenant
      });
      toast.success("Empresa cadastrada com sucesso!");
      setCreating(false);
      setForm(emptyForm);
      void reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await authApi.deleteCompany(toDelete.id);
      toast.success(`Empresa "${toDelete.companyName}" excluída com sucesso.`);
      setToDelete(null);
      void reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <AppShell>
        <div className="flex h-[80vh] flex-col items-center justify-center gap-2">
          <ShieldCheck className="h-12 w-12 text-destructive animate-pulse" />
          <h2 className="text-xl font-bold">Acesso Negado</h2>
          <p className="text-sm text-muted-foreground">
            Apenas o administrador do SaaS pode acessar esta página.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Title & Add Button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Empresas</h2>
            <p className="text-sm text-muted-foreground">
              Cadastre novas empresas parceiras, ative/bloqueie acessos e gerencie assinaturas do SaaS.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4.5 w-4.5" />
            Cadastrar Empresa
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 max-w-sm rounded-lg border bg-card px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar empresa, e-mail, dono ou CPF..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Content Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Carregando empresas...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium">Nenhuma empresa encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 font-medium text-muted-foreground">
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">E-mail Corporativo</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">CPF/CNPJ</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-4 font-semibold text-foreground">
                        {c.companyName}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{c.email}</td>
                      <td className="px-4 py-4">{c.name || "—"}</td>
                      <td className="px-4 py-4 text-muted-foreground">{c.cpf || "—"}</td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold select-none transition-colors border ${
                            c.active
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                          }`}
                        >
                          {c.active ? "Ativo" : "Bloqueado"}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleActive(c)}
                            title={c.active ? "Bloquear acesso" : "Desbloquear acesso"}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {c.active ? (
                              <ToggleRight className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditFeatures(c)}
                            title="Gerenciar Recursos (SaaS)"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Settings className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => setToDelete(c)}
                            title="Excluir Empresa"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Cadastro de Empresa */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Empresa</DialogTitle>
            <DialogDescription>
              Insira os dados da nova empresa parceira do SaaS. Um e-mail administrador será criado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-companyName">Nome da Empresa</Label>
              <Input
                id="create-companyName"
                type="text"
                placeholder="Ex: Ponto do Software"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Nome do Responsável</Label>
              <Input
                id="create-name"
                type="text"
                placeholder="Ex: Raphael"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-cpf">CPF ou CNPJ (apenas letras e números)</Label>
              <Input
                id="create-cpf"
                type="text"
                placeholder="CPF ou CNPJ Alfanumérico"
                maxLength={18}
                value={form.cpf}
                onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">E-mail de Login</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="Ex: contato@empresa.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Senha Provisória</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal - Confirmação de Exclusão */}
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Deseja mesmo excluir esta empresa?"
        description={`Esta ação irá excluir permanentemente a empresa "${toDelete?.companyName}", juntamente com todos os seus operadores, filas, conexões e conversas do WhatsApp. Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
      />

      {/* Modal - Gerenciar Recursos */}
      <Dialog open={!!editingFeatures} onOpenChange={(open) => !open && setEditingFeatures(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Recursos da Empresa</DialogTitle>
            <DialogDescription>
              Habilite ou desabilite os módulos do sistema para a empresa <strong>{editingFeatures?.companyName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[350px] overflow-y-auto space-y-3 py-2 pr-1">
            {[
              { id: "kanban", label: "Kanban / Pipeline", desc: "Quadro de CRM de funil de vendas e contatos." },
              { id: "flows", label: "Flowbuilder / URA", desc: "Construtor visual de fluxos de voz e chatbots." },
              { id: "campaigns", label: "Discador / Campanhas", desc: "Campanhas de ligações em massa e disparos." },
              { id: "quick-messages", label: "Respostas Rápidas", desc: "Templates de mensagens curtas para operadores." },
              { id: "announcements", label: "Mural de Avisos", desc: "Quadro de comunicados internos para a equipe." },
              { id: "scheduled-messages", label: "Agendamentos", desc: "Disparos agendados de mensagens de texto." },
              { id: "reports", label: "Relatórios de Desempenho", desc: "Gráficos e estatísticas de chamadas e mensagens." },
            ].map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 bg-card">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold">{f.label}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{f.desc}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={selectedFeatures.includes(f.id)}
                  onClick={() => toggleFeature(f.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    selectedFeatures.includes(f.id) ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      selectedFeatures.includes(f.id) ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="ghost" onClick={() => setEditingFeatures(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFeatures} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AdminCompaniesPage;
