import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Plus, Trash2, Edit2, Search, Smartphone, Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
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
import { useSessions } from "@/stores/sessions";

interface ScheduledMessage {
  id: string;
  sessionId: string;      // Conexão usada
  sessionName: string;
  contactName: string;    // Nome do cliente
  phone: string;          // Número de celular
  message: string;        // Mensagem
  date: string;           // Data de envio (YYYY-MM-DD)
  time: string;           // Hora de envio (HH:MM)
  status: "pending" | "sent" | "failed";
}

export default function ScheduledMessagesPage() {
  const { t } = useTranslation();
  const { sessions } = useSessions();
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "sent">("all");
  const [loading, setLoading] = useState(true);

  // Form / Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMsg, setEditingMsg] = useState<ScheduledMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [sessionId, setSessionId] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const loadScheduled = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("wacalls.scheduled_messages");
      if (stored) {
        setScheduled(JSON.parse(stored));
      } else {
        const samples: ScheduledMessage[] = [
          {
            id: "sm_1",
            sessionId: "sess_1",
            sessionName: "Suporte Principal",
            contactName: "Raphael Silva",
            phone: "+55 11 99999-8888",
            message: "Olá Raphael! Esta é uma lembrança automática do seu agendamento de suporte amanhã às 14h.",
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            time: "10:00",
            status: "pending",
          },
          {
            id: "sm_2",
            sessionId: "sess_1",
            sessionName: "Suporte Principal",
            contactName: "Mariana Costa",
            phone: "+55 21 98888-7777",
            message: "Oi Mariana, estamos passando para confirmar que o seu setup do WaCalls está concluído com sucesso!",
            date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
            time: "15:30",
            status: "sent",
          },
        ];
        setScheduled(samples);
        localStorage.setItem("wacalls.scheduled_messages", JSON.stringify(samples));
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduled();
  }, []);

  const handleOpenAdd = () => {
    setEditingMsg(null);
    setSessionId(sessions[0]?.id || "");
    setContactName("");
    setPhone("");
    setMessage("");
    // Default to tomorrow 10:00
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    setDate(tomorrow);
    setTime("10:00");
    setModalOpen(true);
  };

  const handleOpenEdit = (msg: ScheduledMessage) => {
    setEditingMsg(msg);
    setSessionId(msg.sessionId);
    setContactName(msg.contactName);
    setPhone(msg.phone);
    setMessage(msg.message);
    setDate(msg.date);
    setTime(msg.time);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) {
      toast.error("Selecione uma conexão WhatsApp");
      return;
    }
    if (!contactName.trim() || !phone.trim()) {
      toast.error("Nome do cliente e número de celular são obrigatórios");
      return;
    }
    if (!message.trim()) {
      toast.error("A mensagem não pode ficar vazia");
      return;
    }
    if (!date || !time) {
      toast.error("Data e hora de envio são obrigatórias");
      return;
    }

    const selectedSession = sessions.find((s) => s.id === sessionId);
    const sessionName = selectedSession ? selectedSession.name : "Conexão";

    let updatedList: ScheduledMessage[];

    if (editingMsg) {
      const updated: ScheduledMessage = {
        ...editingMsg,
        sessionId,
        sessionName,
        contactName: contactName.trim(),
        phone: phone.trim(),
        message: message.trim(),
        date,
        time,
      };
      updatedList = scheduled.map((s) => (s.id === editingMsg.id ? updated : s));
      toast.success("Mensagem agendada atualizada");
    } else {
      const newSM: ScheduledMessage = {
        id: `sm_${Date.now()}`,
        sessionId,
        sessionName,
        contactName: contactName.trim(),
        phone: phone.trim(),
        message: message.trim(),
        date,
        time,
        status: "pending",
      };
      updatedList = [...scheduled, newSM];
      toast.success("Mensagem agendada cadastrada");
    }

    setScheduled(updatedList);
    localStorage.setItem("wacalls.scheduled_messages", JSON.stringify(updatedList));
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const updated = scheduled.filter((s) => s.id !== deletingId);
    setScheduled(updated);
    localStorage.setItem("wacalls.scheduled_messages", JSON.stringify(updated));
    toast.success("Agendamento removido");
    setDeletingId(null);
  };

  const filtered = scheduled.filter((msg) => {
    const matchesSearch =
      msg.contactName.toLowerCase().includes(search.toLowerCase()) ||
      msg.phone.includes(search) ||
      msg.message.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus =
      filterStatus === "all" || msg.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mensagens Agendadas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Programe avisos, cobranças ou mensagens de acompanhamento para serem enviadas em datas futuras.
            </p>
          </div>
          <Button size="sm" onClick={handleOpenAdd} disabled={sessions.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Agendamento
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 max-w-sm flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por contato ou mensagem..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="flex border rounded-lg bg-muted/40 p-0.5 text-xs font-semibold gap-1">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1 rounded-md transition ${
                filterStatus === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-3 py-1 rounded-md transition ${
                filterStatus === "pending" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus("sent")}
              className={`px-3 py-1 rounded-md transition ${
                filterStatus === "sent" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Enviados
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhuma conexão WhatsApp ativa</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Conecte pelo menos um número de WhatsApp em sua página de Conexões para agendar mensagens.
              </p>
            </div>
          ) : loading ? (
            <div className="flex h-64 items-center justify-center">
              <CalendarClock className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhum agendamento encontrado</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Crie um novo lembrete ou agendamento para contatos específicos.
              </p>
              <Button className="mt-6" onClick={handleOpenAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Agendar Primeira Mensagem
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((msg) => (
                <div
                  key={msg.id}
                  className="flex flex-col rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all border-border/60 justify-between min-h-[220px]"
                >
                  <div>
                    {/* Header: Status & Connection */}
                    <div className="flex items-center justify-between border-b pb-2 mb-3 border-border/40">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                        <Smartphone className="h-3 w-3" />
                        {msg.sessionName}
                      </div>

                      {msg.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </span>
                      ) : msg.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          Enviado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3" />
                          Falhou
                        </span>
                      )}
                    </div>

                    {/* Customer details */}
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{msg.contactName}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{msg.phone}</p>
                    </div>

                    {/* Date/Time badge */}
                    <div className="flex gap-4 items-center mt-3 text-[10px] text-primary bg-primary/5 border border-primary/10 rounded-lg p-2 max-w-max">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span>{new Date(msg.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-primary" />
                        <span>{msg.time}</span>
                      </div>
                    </div>

                    {/* Message content */}
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-3 italic">
                      "{msg.message}"
                    </p>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border/40 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(msg.id)}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t("actions.remove")}
                    </Button>
                    {msg.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(msg)}
                        className="h-8 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        {t("actions.edit")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dialog Form */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMsg ? t("actions.edit") : t("actions.create")} Agendamento
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Conexão Remetente</Label>
                  <select
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-3 text-xs"
                    required
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Nome do Cliente</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Celular do Cliente (com DDI)</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: +5511999998888"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label>Hora do Envio</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Data de Envio</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Mensagem a ser enviada</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escreva o texto completo do disparo..."
                  rows={4}
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("common.save")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingId}
          onOpenChange={(o) => !o && setDeletingId(null)}
          title="Excluir agendamento?"
          description="A mensagem agendada será removida e não será disparada para o cliente."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
