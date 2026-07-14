import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Plus, Trash2, Edit2, Key, HelpCircle, Music, VolumeX, Loader2, Play, Pause, Save, SlidersHorizontal } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as hmApi from "@/services/holdMusic";

interface AIAgent {
  id: string;
  name: string;
  provider: "openai" | "elevenlabs";
  model: string;
  voiceId: string;
  prompt: string;
  temperature: number;
}

export default function AgentsPage() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: "agents" | "holdmusic"
  const [activeTab, setActiveTab] = useState<"agents" | "holdmusic">("agents");

  // Hold Music States
  const [hmInfo, setHmInfo] = useState<hmApi.HoldMusicInfo | null>(null);
  const [hmLoading, setHmLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingHm, setSavingHm] = useState(false);
  const [volume, setVolume] = useState(100); // 0-100%
  const [fadeIn, setFadeIn] = useState(800);
  const [fadeOut, setFadeOut] = useState(500);

  const loadHoldMusic = async () => {
    setHmLoading(true);
    try {
      const data = await hmApi.getHoldMusic();
      setHmInfo(data);
      if (data.config) {
        setVolume(Math.round(data.config.volume * 100));
        setFadeIn(data.config.fadeInMs);
        setFadeOut(data.config.fadeOutMs);
      }
    } catch (e) {
      // It might not exist yet
    } finally {
      setHmLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "holdmusic") {
      void loadHoldMusic();
    }
  }, [activeTab]);

  // Dialogs
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"openai" | "elevenlabs">("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [voiceId, setVoiceId] = useState("Rachel");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);

  const loadAgents = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("wacalls.ai_agents");
      if (stored) {
        setAgents(JSON.parse(stored));
      } else {
        // Sample agents
        const samples: AIAgent[] = [
          {
            id: "agent_1",
            name: "Suporte de Vendas (Voz)",
            provider: "elevenlabs",
            model: "eleven_monolingual_v1",
            voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
            prompt: "Você é uma assistente de vendas da Ponto do Software. Seja cordial e breve.",
            temperature: 0.5,
          },
          {
            id: "agent_2",
            name: "FAQ Chatbot (OpenAI)",
            provider: "openai",
            model: "gpt-4o-mini",
            voiceId: "",
            prompt: "Responda dúvidas frequentes sobre a API do WaCalls de forma direta.",
            temperature: 0.7,
          },
        ];
        setAgents(samples);
        localStorage.setItem("wacalls.ai_agents", JSON.stringify(samples));
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedList: AIAgent[];

    if (editingAgent) {
      const updated = {
        ...editingAgent,
        name,
        provider,
        model,
        voiceId: provider === "elevenlabs" ? voiceId : "",
        prompt,
        temperature,
      };
      updatedList = agents.map((a) => (a.id === editingAgent.id ? updated : a));
      toast.success(t("common.save"));
    } else {
      const newAgent: AIAgent = {
        id: `agent_${Date.now()}`,
        name,
        provider,
        model,
        voiceId: provider === "elevenlabs" ? voiceId : "",
        prompt,
        temperature,
      };
      updatedList = [...agents, newAgent];
      toast.success(t("queues.createdToast"));
    }

    setAgents(updatedList);
    localStorage.setItem("wacalls.ai_agents", JSON.stringify(updatedList));
    setModalOpen(false);
  };

  const handleOpenAdd = () => {
    setEditingAgent(null);
    setName("");
    setProvider("openai");
    setModel("gpt-4o-mini");
    setVoiceId("Rachel");
    setPrompt("");
    setTemperature(0.7);
    setModalOpen(true);
  };

  const handleOpenEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setProvider(agent.provider);
    setModel(agent.model);
    setVoiceId(agent.voiceId || "Rachel");
    setPrompt(agent.prompt);
    setTemperature(agent.temperature);
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const updated = agents.filter((a) => a.id !== deletingId);
    setAgents(updated);
    localStorage.setItem("wacalls.ai_agents", JSON.stringify(updated));
    toast.success(t("agents.deleted"));
    setDeletingId(null);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div>
            <h1 className="text-xl font-bold text-foreground">Agentes e Voz</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure prompts de IA e músicas de espera globais para sua telefonia VoIP.
            </p>
          </div>
          {activeTab === "agents" && (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Agente
            </Button>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b shrink-0 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("agents")}
            className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "agents" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4" />
            Agentes de IA
          </button>
          <button
            onClick={() => setActiveTab("holdmusic")}
            className={`pb-2 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "holdmusic" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Music className="h-4 w-4" />
            Música de Espera Global
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "agents" ? (
            loading ? (
              <div className="flex h-64 items-center justify-center">
                <Bot className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <div className="flex h-72 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">{t("agents.empty")}</h3>
                <p className="text-muted-foreground text-sm mt-2">
                  Cadastre um agente para acoplá-lo às suas ligações telefônicas ou chats de WhatsApp.
                </p>
                <Button className="mt-6" onClick={handleOpenAdd}>
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Primeiro Agente
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex flex-col rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all border-border/60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-base truncate text-foreground">{agent.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                              agent.provider === "elevenlabs"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {agent.provider === "elevenlabs" ? "ElevenLabs (Voz)" : "OpenAI (Chat)"}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {agent.model}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4 line-clamp-3 bg-muted/30 p-2.5 rounded italic">
                      "{agent.prompt}"
                    </p>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-border/40 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(agent.id)}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t("actions.remove")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(agent)}
                        className="h-8 text-xs"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        {t("actions.edit")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : hmLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-w-xl mx-auto mt-6 flex flex-col gap-6">
              {/* Música de Espera status */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Music className="h-4 w-4 text-primary" />
                  Arquivo de Música de Espera
                </div>

                {hmInfo?.exists ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-emerald-500">Música de Espera Ativa</p>
                        {hmInfo.sizeBytes && (
                          <p className="text-muted-foreground text-[10px]">
                            Tamanho: {(hmInfo.sizeBytes / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteMusic}
                        className="h-8 text-xs text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                      <audio
                        controls
                        src={hmApi.holdMusicPreviewUrl()}
                        className="w-full h-9 mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-500">
                      <VolumeX className="h-4 w-4 shrink-0" />
                      Sem música de espera personalizada. O sistema usará o tom de chamada padrão (Ringback).
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Enviar Arquivo de Áudio</Label>
                      <div className="border border-dashed rounded-lg p-6 text-center hover:bg-secondary/20 transition-all relative">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleUploadMusic}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          {uploading ? (
                            <>
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <p className="text-xs font-semibold">Processando e convertendo áudio...</p>
                            </>
                          ) : (
                            <>
                              <Music className="h-8 w-8 text-muted-foreground" />
                              <p className="text-xs font-semibold">Clique para selecionar ou arraste o áudio</p>
                              <p className="text-[10px] text-muted-foreground">Suporta MP3, WAV, OGG, M4A. Resampling automático.</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Configurações de Fades / Volume */}
              <form onSubmit={handleSaveConfig} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Ajustes de Áudio
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label>Volume da Música: {volume}%</Label>
                    </div>
                    <Input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Fade In (Suavização ao iniciar - ms)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5000"
                        value={fadeIn}
                        onChange={(e) => setFadeIn(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Fade Out (Suavização ao parar - ms)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5000"
                        value={fadeOut}
                        onChange={(e) => setFadeOut(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button type="submit" size="sm" disabled={savingHm}>
                    {savingHm ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Salvar Ajustes
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Dialog Form */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? t("actions.edit") : t("actions.create")} Agente IA
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label>Nome do Agente</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Provedor IA</Label>
                  <Select
                    value={provider}
                    onValueChange={(val) => setProvider(val as "openai" | "elevenlabs")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI (Chatbot)</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs (Agente de Voz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Modelo de IA</Label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} required />
                </div>
              </div>

              {provider === "elevenlabs" && (
                <div className="space-y-1">
                  <Label>Voice ID (ID da voz do ElevenLabs)</Label>
                  <Input
                    value={voiceId}
                    onChange={(e) => setVoiceId(e.target.value)}
                    placeholder="Rachel (21m00Tcm4Tlv...)"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label>Prompt / Instruções de Comportamento</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Escreva como o agente deve responder aos clientes e leads..."
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label>Temperatura (Criatividade: {temperature})</Label>
                  <span className="text-[10px] text-muted-foreground">0.0 (Fiel) a 1.0 (Criativo)</span>
                </div>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full"
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
          title={t("agents.deletePrompt", {
            name: agents.find((a) => a.id === deletingId)?.name || "",
          })}
          description="O agente será removido e não poderá mais interagir nas conversas ativas."
          confirmLabel={t("common.delete")}
          destructive
          onConfirm={handleDelete}
        />
      </div>
    </AppShell>
  );
}
