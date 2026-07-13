import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import type { KanbanBoard } from "@/types/kanban";
import * as kanbanApi from "@/services/kanban";
import { KanbanBoardComponent } from "@/components/kanban/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function KanbanPage() {
  const { t } = useTranslation();
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Board creation dialog
  const [modalOpen, setModalOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardColor, setBoardColor] = useState("#3b82f6");
  const [boardDesc, setBoardDesc] = useState("");

  const loadBoards = async () => {
    setLoading(true);
    try {
      const list = await kanbanApi.listBoards();
      setBoards(list);
      if (list.length > 0) {
        // Default to first board if none selected yet
        setActiveBoardId((prev) => prev ?? list[0].id);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoards();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;
    try {
      const newBoard = await kanbanApi.createBoard(boardName, boardColor, boardDesc);
      setBoards([...boards, newBoard]);
      setActiveBoardId(newBoard.id);
      setModalOpen(false);
      toast.success(t("queues.createdToast"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleOpenCreateModal = () => {
    setBoardName("");
    setBoardColor("#3b82f6");
    setBoardDesc("");
    setModalOpen(true);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full gap-4 p-6 overflow-hidden">
        {/* Header toolbar */}
        <div className="flex items-center justify-between shrink-0 pb-2 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">Pipeline Kanban</h1>
            {boards.length > 0 && (
              <select
                value={activeBoardId || ""}
                onChange={(e) => setActiveBoardId(e.target.value)}
                className="bg-background border rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button size="sm" onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Funil
          </Button>
        </div>

        {/* Board content */}
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : boards.length === 0 ? (
            <div className="flex h-96 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center max-w-lg mx-auto mt-12">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">{t("common.empty")}</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Nenhum funil ou pipeline Kanban cadastrado. Crie o seu primeiro funil para organizar atendimentos por colunas.
              </p>
              <Button className="mt-6" onClick={handleOpenCreateModal}>
                <Plus className="h-4 w-4 mr-1" />
                Criar Primeiro Funil
              </Button>
            </div>
          ) : (
            activeBoardId && <KanbanBoardComponent boardId={activeBoardId} />
          )}
        </div>

        {/* Board Creation Dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Funil</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBoard} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>{t("common.name")}</Label>
                <Input
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Ex: Funil Comercial, Pipeline de Suporte"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input
                  value={boardDesc}
                  onChange={(e) => setBoardDesc(e.target.value)}
                  placeholder="Ex: Gerenciamento de leads de vendas"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("common.color")}</Label>
                <Input
                  type="color"
                  value={boardColor}
                  onChange={(e) => setBoardColor(e.target.value)}
                  className="h-10 w-20 px-1"
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
      </div>
    </AppShell>
  );
}
