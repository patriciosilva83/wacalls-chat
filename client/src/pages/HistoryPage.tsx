import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Search,
  SlidersHorizontal,
  Download,
  Play,
  Pause,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessions } from "@/stores/sessions";
import { fetchCallHistory } from "@/services/callsHistory";
import type { CallHistoryRow, CallHistoryKpis } from "@/services/callsHistory";
import { apiUrl } from "@/lib/api-base";

// Componente para o Player de Áudio customizado e premium
function CallAudioPlayer({ token }: { token: string }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [audio] = useState(() => new Audio(apiUrl(`/api/recordings/${token}`)));

  useEffect(() => {
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audio]);

  const togglePlay = () => {
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => toast.error("Erro ao reproduzir gravação"));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * duration;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-2 text-xs w-full max-w-xs select-none">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full shrink-0 bg-primary/10 hover:bg-primary/20"
        onClick={togglePlay}
      >
        {playing ? (
          <Pause className="h-4 w-4 text-primary animate-pulse" />
        ) : (
          <Play className="h-4 w-4 text-primary ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>{formatTime(audio.currentTime)}</span>
          <span>{duration ? formatTime(duration) : "--:--"}</span>
        </div>
        <div
          className="h-1.5 w-full bg-secondary rounded-full overflow-hidden cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <a
        href={apiUrl(`/api/recordings/${token}`)}
        download
        className="p-1.5 hover:bg-secondary rounded-md shrink-0 text-muted-foreground hover:text-foreground"
        title="Baixar áudio"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const sessions = useSessions((s) => s.sessions);

  // Filtros
  const [q, setQ] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [direction, setDirection] = useState<"inbound" | "outbound" | "">("");
  const [status, setStatus] = useState<"answered" | "missed" | "">("");
  const [range, setRange] = useState("7d");

  // Dados
  const [calls, setCalls] = useState<CallHistoryRow[]>([]);
  const [kpis, setKpis] = useState<CallHistoryKpis | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const from = now - days * 24 * 60 * 60 * 1000;

      const res = await fetchCallHistory({
        from,
        to: now,
        sessionId: sessionId || undefined,
        direction: direction || undefined,
        status: status || undefined,
        q: q || undefined,
        limit: 100,
      });

      setCalls(res.rows || []);
      setKpis(res.kpis || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [q, sessionId, direction, status, range]);

  const formatDuration = (ms: number) => {
    if (!ms) return "0s";
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getEndReasonLabel = (reason: string) => {
    switch (reason) {
      case "user-ended":
        return "Desconectado pelo usuário";
      case "missed":
        return "Chamada perdida";
      case "rejected":
        return "Chamada rejeitada";
      case "timeout":
        return "Sem resposta";
      default:
        return reason || "Sem detalhes";
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Phone className="h-6 w-6 text-primary" />
              Histórico de Ligações
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visualize o histórico de chamadas recebidas, realizadas e gravações de áudio.
            </p>
          </div>
          <Button onClick={() => void loadData()} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>

        {/* KPIs Cards */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Total</p>
                <h3 className="text-lg font-bold">{kpis.total}</h3>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <PhoneIncoming className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Atendidas</p>
                <h3 className="text-lg font-bold text-emerald-500">{kpis.answered}</h3>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <PhoneMissed className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Perdidas</p>
                <h3 className="text-lg font-bold text-red-500">{kpis.missed}</h3>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase">Média</p>
                <h3 className="text-lg font-bold text-amber-500">{formatDuration(kpis.avgDurationMs)}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col gap-4 bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold border-b pb-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Filtros Avançados
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Pesquisa rápida</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou número..."
                  className="pl-8 h-9"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Conexão</Label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as conexões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as conexões</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Sentido</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="inbound">Entradas</SelectItem>
                  <SelectItem value="outbound">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="answered">Atendidas</SelectItem>
                  <SelectItem value="missed">Perdidas / Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="7 dias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Lista de Chamadas */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Buscando chamadas...</p>
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground gap-4">
              <Phone className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="text-base font-semibold text-foreground">Nenhuma chamada encontrada</p>
                <p className="text-xs mt-1">Tente ajustar seus filtros de busca ou período.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {calls.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4 hover:bg-secondary/10 transition-colors"
                >
                  {/* Informações do Peer */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                      {c.name ? c.name.slice(0, 2) : "C"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-foreground">
                          {c.name || "Contato Desconhecido"}
                        </span>
                        {c.sessionName && (
                          <span className="text-[10px] bg-secondary border text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                            {c.sessionName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        +{c.phone || c.peer.split("@")[0]}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes de Sentido e Data */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col gap-1 items-start md:items-end">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
                        {c.direction === "inbound" ? (
                          <span className="text-emerald-500 flex items-center gap-1">
                            <PhoneIncoming className="h-3.5 w-3.5" /> Recebida
                          </span>
                        ) : (
                          <span className="text-blue-500 flex items-center gap-1">
                            <PhoneOutgoing className="h-3.5 w-3.5" /> Realizada
                          </span>
                        )}
                        <span className="text-muted-foreground font-normal">
                          ({formatDuration(c.durationMs)})
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(c.startedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0 items-start md:items-end">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider ${
                          c.answered
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {c.answered ? "Atendida" : "Perdida"}
                      </span>
                      {c.endReason && c.endReason !== "user-ended" && (
                        <span className="text-[9px] text-red-500 max-w-[140px] truncate" title={c.endReason}>
                          {getEndReasonLabel(c.endReason)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gravação de Áudio */}
                  <div className="w-full md:w-auto flex items-center justify-end shrink-0 md:border-l md:pl-4 min-h-[44px]">
                    {c.recording?.token ? (
                      <CallAudioPlayer token={c.recording.token} />
                    ) : (
                      <span className="text-xs text-muted-foreground/60 italic">
                        Sem gravação de áudio
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
