import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Connection,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Play, Save, ChevronLeft, Plus, Settings, HelpCircle, Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FlowRow, FlowNode, FlowEdge, FlowNodeType } from "@/types/flow";
import * as flowsApi from "@/services/flows";

// List of all node types and their labels
const NODE_TYPES_CONFIG: Record<string, { label: string; group: "voice" | "chat" | "logic" }> = {
  // Voice Nodes
  voice_menu: { label: "Menu de Voz (IVR)", group: "voice" },
  message: { label: "Falar Mensagem (TTS)", group: "voice" },
  record_audio: { label: "Gravar Áudio", group: "voice" },
  dtmf_capture: { label: "Captura DTMF", group: "voice" },
  transfer: { label: "Transferir Chamada", group: "voice" },
  ai_agent: { label: "Agente IA (Voz)", group: "voice" },
  // Chat Nodes
  chat_text: { label: "Enviar Texto", group: "chat" },
  chat_media: { label: "Enviar Mídia", group: "chat" },
  chat_menu: { label: "Menu Chatbot", group: "chat" },
  chat_input: { label: "Aguardar Entrada", group: "chat" },
  chat_queue: { label: "Fila de Atendimento", group: "chat" },
  chat_attendant: { label: "Direcionar p/ Atendente", group: "chat" },
  chat_tag_add: { label: "Adicionar Tag", group: "chat" },
  chat_tag_remove: { label: "Remover Tag", group: "chat" },
  // Logic Nodes
  set_variable: { label: "Definir Variável", group: "logic" },
  condition: { label: "Condição (Se/Senão)", group: "logic" },
  webhook: { label: "Disparar Webhook (API)", group: "logic" },
  delay: { label: "Aguardar Intervalo (Delay)", group: "logic" },
  end: { label: "Finalizar Fluxo", group: "logic" },
};

export default function FlowBuilderEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [flow, setFlow] = useState<FlowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Editor states
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const loadFlow = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const row = await flowsApi.getFlow(id);
      setFlow(row);
      const graph = flowsApi.parseGraph(row.graph);

      // Convert stored FlowNode to React Flow nodes
      const rfNodes = graph.nodes.map((n) => ({
        id: n.id,
        type: "default", // use default visual node
        position: n.position,
        data: { label: n.data.label || NODE_TYPES_CONFIG[n.type]?.label || n.type, ...n.data },
      }));

      // Convert stored FlowEdge to React Flow edges
      const rfEdges = graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFlow();
  }, [id]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = async () => {
    if (!id || !flow) return;
    setSaving(true);
    try {
      // Map React Flow nodes back to FlowNode
      const graphNodes: FlowNode[] = nodes.map((n) => ({
        id: n.id,
        type: (nodes.find((x) => x.id === n.id)?.data?.type as FlowNodeType) || "chat_text",
        position: n.position,
        data: n.data as any,
      }));

      // Map React Flow edges back to FlowEdge
      const graphEdges: FlowEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
      }));

      const newGraph = flowsApi.serializeGraph({
        nodes: graphNodes,
        edges: graphEdges,
        startNodeId: graphNodes.find((n) => n.id === "start")?.id || graphNodes[0]?.id || "",
        kind: flow.trigger === "outbound" ? "voice" : "chat",
      });

      await flowsApi.updateFlow(id, { graph: newGraph });
      toast.success(t("common.save"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Add new node of specified type
  const handleAddNode = (type: FlowNodeType) => {
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type: "default",
      position: { x: 300, y: 200 },
      data: {
        type,
        label: NODE_TYPES_CONFIG[type]?.label || type,
        // Defaults
        prompt: "",
        text: "",
        timeout: 10,
        options: [],
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsSidebarOpen(false);
  };

  const handleNodeClick = (_: any, node: any) => {
    // Cast and load details in properties sidepanel
    const targetNode: FlowNode = {
      id: node.id,
      type: node.data.type || "chat_text",
      position: node.position,
      data: node.data,
    };
    setSelectedNode(targetNode);
  };

  const handleUpdateNodeProp = (key: string, value: any) => {
    if (!selectedNode) return;
    
    // Update active node locally
    const updatedData = { ...selectedNode.data, [key]: value };
    setSelectedNode({ ...selectedNode, data: updatedData });

    // Sync to React Flow nodes state
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                [key]: value,
                // keep visual label clean
                label: key === "label" ? value : n.data.label,
              },
            }
          : n
      )
    );
  };

  const handleDeleteNode = (id: string) => {
    if (id === "start") {
      toast.error("Nó inicial não pode ser removido.");
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!flow) return null;

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden relative">
        {/* Editor Sub-Header Toolbar */}
        <div className="flex justify-between items-center bg-muted/30 border-b p-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/flows")} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="font-semibold text-sm leading-none text-foreground">{flow.name}</h1>
              <span className="text-[10px] text-muted-foreground">Editor de Fluxo</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsSidebarOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Inserir Bloco
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 text-xs">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              {t("common.save")}
            </Button>
          </div>
        </div>

        {/* Canvas & Panel Split grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* React Flow Board canvas */}
          <div className="flex-1 h-full bg-muted/10 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              fitView
              className="font-sans text-sm"
            >
              <Background />
              <Controls />
              <MiniMap />
              <Panel position="top-left" className="bg-background border rounded px-3 py-1.5 shadow-sm text-xs text-muted-foreground flex gap-1 items-center">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span>Clique duas vezes em uma ligação para desconectar. Clique no bloco para editar.</span>
              </Panel>
            </ReactFlow>
          </div>

          {/* Properties Drawer sidepanel (Right) */}
          {selectedNode && (
            <div className="w-80 h-full border-l bg-card overflow-y-auto p-4 flex flex-col gap-4 shrink-0">
              <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="font-semibold text-sm text-foreground">Configurar Bloco</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteNode(selectedNode.id)}
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                >
                  Excluir
                </Button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label>Rótulo do Bloco</Label>
                  <Input
                    value={selectedNode.data.label || ""}
                    onChange={(e) => handleUpdateNodeProp("label", e.target.value)}
                  />
                </div>

                {/* Speak message node configs */}
                {(selectedNode.type === "message" || selectedNode.type === "chat_text") && (
                  <div className="space-y-1">
                    <Label>Texto da Mensagem</Label>
                    <Textarea
                      value={selectedNode.data.text || selectedNode.data.prompt || ""}
                      onChange={(e) => {
                        handleUpdateNodeProp("text", e.target.value);
                        handleUpdateNodeProp("prompt", e.target.value);
                      }}
                      rows={4}
                      placeholder="Olá! Digite sua mensagem aqui…"
                    />
                  </div>
                )}

                {/* Webhook API node configs */}
                {selectedNode.type === "webhook" && (
                  <>
                    <div className="space-y-1">
                      <Label>Endereço URL da API</Label>
                      <Input
                        value={selectedNode.data.url || ""}
                        onChange={(e) => handleUpdateNodeProp("url", e.target.value)}
                        placeholder="https://api.meusistema.com/webhook"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Método HTTP</Label>
                      <Select
                        value={selectedNode.data.method || "POST"}
                        onValueChange={(val) => handleUpdateNodeProp("method", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Variável para Salvar Resposta</Label>
                      <Input
                        value={selectedNode.data.saveAs || ""}
                        onChange={(e) => handleUpdateNodeProp("saveAs", e.target.value)}
                        placeholder="Ex: resposta_api"
                      />
                    </div>
                  </>
                )}

                {/* Queue transfer / switch flow configs */}
                {selectedNode.type === "chat_queue" && (
                  <div className="space-y-1">
                    <Label>ID da Fila de Destino</Label>
                    <Input
                      value={selectedNode.data.queueId || ""}
                      onChange={(e) => handleUpdateNodeProp("queueId", e.target.value)}
                      placeholder="Ex: id_suporte"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Node Drawer Side-slider (Left) */}
        {isSidebarOpen && (
          <div className="absolute inset-y-0 left-0 w-80 bg-background border-r shadow-lg z-50 p-4 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-semibold text-sm text-foreground">Adicionar Bloco</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)}>
                Fechar
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Blocos URA (Voz)</h4>
                <div className="grid grid-cols-1 gap-1">
                  {Object.entries(NODE_TYPES_CONFIG)
                    .filter(([_, conf]) => conf.group === "voice")
                    .map(([type, conf]) => (
                      <Button
                        key={type}
                        variant="ghost"
                        onClick={() => handleAddNode(type as FlowNodeType)}
                        className="justify-start text-xs h-9 w-full"
                      >
                        {conf.label}
                      </Button>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Blocos Chatbot</h4>
                <div className="grid grid-cols-1 gap-1">
                  {Object.entries(NODE_TYPES_CONFIG)
                    .filter(([_, conf]) => conf.group === "chat")
                    .map(([type, conf]) => (
                      <Button
                        key={type}
                        variant="ghost"
                        onClick={() => handleAddNode(type as FlowNodeType)}
                        className="justify-start text-xs h-9 w-full"
                      >
                        {conf.label}
                      </Button>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Blocos Lógicos / API</h4>
                <div className="grid grid-cols-1 gap-1">
                  {Object.entries(NODE_TYPES_CONFIG)
                    .filter(([_, conf]) => conf.group === "logic")
                    .map(([type, conf]) => (
                      <Button
                        key={type}
                        variant="ghost"
                        onClick={() => handleAddNode(type as FlowNodeType)}
                        className="justify-start text-xs h-9 w-full"
                      >
                        {conf.label}
                      </Button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
