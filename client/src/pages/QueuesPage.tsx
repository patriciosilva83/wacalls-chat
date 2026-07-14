import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Users2, Music, VolumeX, Save, SlidersHorizontal } from "lucide-react";
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
import {
  listQueues,
  createQueue,
  updateQueue,
  deleteQueue,
} from "@/services/queues";
import type { Queue } from "@/types/queue";
import * as hmApi from "@/services/holdMusic";

const DEFAULT_COLORS = [
  "#57adf8", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#eab308",
];

type Editing = { queue: Queue | null; name: string; color: string; greeting: string };

const emptyEditing = (): Editing => ({
  queue: null,
  name: "",
  color: DEFAULT_COLORS[0],
  greeting: "",
});

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Editing | null>(null);
  const [toDelete, setToDelete] = useState<Queue | null>(null);

  // Hold Music States for Queues
  const [hmInfo, setHmInfo] = useState<Record<string, hmApi.HoldMusicInfo>>({});
  const [hmLoading, setHmLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [volume, setVolume] = useState(100);
  const [fadeIn, setFadeIn] = useState(800);
  const [fadeOut, setFadeOut] = useState(500);
  const [savingHm, setSavingHm] = useState(false);

  const loadQueueHoldMusic = async (queueId: string) => {
    setHmLoading(true);
    try {
      const data = await hmApi.getHoldMusic(queueId);
      setHmInfo((prev) => ({ ...prev, [queueId]: data }));
      if (data.config) {
        setVolume(Math.round(data.config.volume * 100));
        setFadeIn(data.config.fadeInMs);
        setFadeOut(data.config.fadeOutMs);
      } else {
        setVolume(100);
        setFadeIn(800);
        setFadeOut(500);
      }
    } catch (e) {
      setHmInfo((prev) => ({ ...prev, [queueId]: { key: `queue_${queueId}`, exists: false } }));
    } finally {
      setHmLoading(false);
    }
  };

  const handleUploadMusic = async (e: React.ChangeEvent<HTMLInputElement>, queueId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await hmApi.uploadHoldMusic(file, queueId);
      setHmInfo((prev) => ({ ...prev, [queueId]: data }));
      toast.success("Música de espera da fila enviada!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar áudio");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMusic = async (queueId: string) => {
    try {
      await hmApi.deleteHoldMusic(queueId);
      setHmInfo((prev) => ({ ...prev, [queueId]: { key: `queue_${queueId}`, exists: false } }));
      toast.success("Música de espera removida");
    } catch (err) {
      toast.error("Erro ao remover música");
    }
  };

  const handleSaveMusicConfig = async (queueId: string) => {
    setSavingHm(true);
    try {
      await hmApi.saveHoldMusicConfig(
        {
          volume: volume / 100,
          fadeInMs: fadeIn,
          fadeOutMs: fadeOut,
        },
        queueId
      );
      toast.success("Ajustes de áudio salvos");
    } catch (err) {
      toast.error("Erro ao salvar ajustes");
    } finally {
      setSavingHm(false);
    }
  };

  useEffect(() => {
    if (modal?.queue?.id) {
      void loadQueueHoldMusic(modal.queue.id);
    }
  }, [modal?.queue?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listQueues();
      setQueues(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar filas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    if (!modal || !modal.name.trim()) return;
    setSaving(true);
    try {
      if (modal.queue) {
        await updateQueue(modal.queue.id, modal.name.trim(), modal.color, {
          greeting: modal.greeting,
        });
        toast.success("Fila atualizada");
      } else {
        const q = await createQueue(modal.name.trim(), modal.color);
        if (modal.greeting.trim()) {
          await updateQueue(q.id, modal.name.trim(), modal.color, { greeting: modal.greeting });
        }
        toast.success("Fila criada");
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (q: Queue) => {
    try {
      await deleteQueue(q.id);
      toast.success("Fila removida");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" /> Filas
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize atendimentos em filas e vincule a conexões e usuários.
            </p>
          </div>
          <Button onClick={() => setModal(emptyEditing())}>
            <Plus className="h-4 w-4" /> Nova fila
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : queues.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed bg-card/40 p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-medium">Nenhuma fila criada</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Crie sua primeira fila para começar a organizar atendimentos.
            </div>
            <Button className="mt-4" onClick={() => setModal(emptyEditing())}>
              <Plus className="h-4 w-4" /> Nova fila
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queues.map((q) => (
              <div key={q.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg"
                      style={{ backgroundColor: q.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{q.name}</p>
                    </div>

                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setModal({
                          queue: q,
                          name: q.name,
                          color: q.color,
                          greeting: q.greeting ?? "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setToDelete(q)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

            ))}
          </div>
        )}
      </div>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal?.queue ? "Editar fila" : "Nova fila"}</DialogTitle>
          </DialogHeader>
          {modal && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={modal.name}
                  onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  placeholder="Ex: Vendas, Suporte..."
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModal({ ...modal, color: c })}
                      className={`h-8 w-8 rounded-md border-2 transition ${
                        modal.color === c ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                  <Input
                    type="color"
                    value={modal.color}
                    onChange={(e) => setModal({ ...modal, color: e.target.value })}
                    className="h-8 w-14 cursor-pointer p-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Saudação</Label>
                <Textarea
                  value={modal.greeting}
                  onChange={(e) => setModal({ ...modal, greeting: e.target.value })}
                  placeholder="Mensagem falada ou enviada ao entrar na fila..."
                  rows={3}
                />
              </div>

              {modal.queue && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Music className="h-3.5 w-3.5 text-primary" />
                    Música de Espera da Fila
                  </h4>

                  {hmLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : hmInfo[modal.queue.id]?.exists ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px]">
                        <span className="font-semibold text-emerald-500">Música de espera ativa</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMusic(modal.queue!.id)}
                          className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600"
                        >
                          Remover
                        </Button>
                      </div>
                      
                      <div className="space-y-2 bg-secondary/20 p-3 rounded-lg border">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                          <SlidersHorizontal className="h-3 w-3" /> Configuração de Fades / Volume
                        </div>
                        <div className="space-y-3 text-[10px]">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <Label className="text-[10px]">Volume: {volume}%</Label>
                            </div>
                            <Input
                              type="range"
                              min="0"
                              max="100"
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              className="h-6 p-0"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px]">Fade In (ms)</Label>
                              <Input
                                type="number"
                                value={fadeIn}
                                onChange={(e) => setFadeIn(Number(e.target.value))}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px]">Fade Out (ms)</Label>
                              <Input
                                type="number"
                                value={fadeOut}
                                onChange={(e) => setFadeOut(Number(e.target.value))}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveMusicConfig(modal.queue!.id)}
                              disabled={savingHm}
                              className="h-6 text-[10px]"
                            >
                              {savingHm ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Salvar Ajustes
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                        <VolumeX className="h-3.5 w-3.5 shrink-0" />
                        Sem música de espera personalizada (usará o tom de chamada padrão).
                      </div>
                      
                      <div className="border border-dashed rounded-lg p-4 text-center hover:bg-secondary/20 relative transition-all">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleUploadMusic(e, modal.queue!.id)}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-1 text-[10px]">
                          {uploading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <p className="font-semibold">Enviando e convertendo áudio...</p>
                            </>
                          ) : (
                            <>
                              <Music className="h-5 w-5 text-muted-foreground" />
                              <p className="font-semibold text-muted-foreground">Clique para enviar áudio (.mp3, .wav...)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving || !modal?.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover fila?"
        description={toDelete ? `A fila "${toDelete.name}" será removida.` : undefined}
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          if (toDelete) void onDelete(toDelete);
        }}
      />
    </AppShell>
  );
}
