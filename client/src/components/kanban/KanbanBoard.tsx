import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { KanbanBoard, KanbanColumn, KanbanCard, BoardSnapshot, StageType } from "@/types/kanban";
import * as kanbanApi from "@/services/kanban";
import { KanbanColumnComponent } from "./KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { listSessions } from "@/services/sessions";
import type { SessionInfo } from "@/types/session";

interface KanbanBoardProps {
  boardId: string;
}

export const KanbanBoardComponent = ({ boardId }: KanbanBoardProps) => {
  const { t } = useTranslation();
  const [boardData, setBoardData] = useState<BoardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  // Dialog states
  const [colModalOpen, setColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<KanbanColumn | null>(null);
  const [colName, setColName] = useState("");
  const [colColor, setColColor] = useState("#3b82f6");
  const [colStageType, setColStageType] = useState<StageType>("open");

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [targetColId, setTargetColId] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  const [cardDesc, setCardDesc] = useState("");
  const [cardColor, setCardColor] = useState("#3b82f6");
  const [cardSessionId, setCardSessionId] = useState("");
  const [cardChatJid, setCardChatJid] = useState("");
  const [cardDueAt, setCardDueAt] = useState("");

  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<string | null>(null);

  const loadBoard = async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const snap = await kanbanApi.getBoard(boardId);
      setBoardData(snap);
    } catch (e) {
      toast.error(t("settings.noAccess") + ": " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoard();
    void listSessions().then(setSessions).catch(() => {});
  }, [boardId]);

  const handleMoveCard = async (cardId: string, columnId: string, position: number) => {
    if (!boardData) return;
    
    // Optimistic update
    const previousCards = boardData.cards;
    const updatedCards = boardData.cards.map((c) =>
      c.id === cardId ? { ...c, columnId, position } : c
    );
    setBoardData({ ...boardData, cards: updatedCards });

    try {
      await kanbanApi.moveCard(cardId, columnId, position);
    } catch (e) {
      toast.error((e as Error).message);
      // Rollback
      setBoardData({ ...boardData, cards: previousCards });
    }
  };

  // ----- Columns -----
  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    try {
      if (editingCol) {
        const updated = await kanbanApi.updateColumn(editingCol.id, colName, colColor, colStageType);
        if (boardData) {
          setBoardData({
            ...boardData,
            columns: boardData.columns.map((c) => (c.id === editingCol.id ? updated : c)),
          });
        }
        toast.success(t("common.save"));
      } else {
        const newCol = await kanbanApi.createColumn(boardId, colName, colColor, colStageType);
        if (boardData) {
          setBoardData({
            ...boardData,
            columns: [...boardData.columns, newCol],
          });
        }
        toast.success(t("queues.createdToast"));
      }
      setColModalOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleOpenAddCol = () => {
    setEditingCol(null);
    setColName("");
    setColColor("#3b82f6");
    setColStageType("open");
    setColModalOpen(true);
  };

  const handleOpenEditCol = (col: KanbanColumn) => {
    setEditingCol(col);
    setColName(col.name);
    setColColor(col.color);
    setColStageType(col.stageType);
    setColModalOpen(true);
  };

  const handleDeleteColumn = async () => {
    if (!confirmDeleteCol) return;
    try {
      await kanbanApi.deleteColumn(confirmDeleteCol);
      if (boardData) {
        setBoardData({
          ...boardData,
          columns: boardData.columns.filter((c) => c.id !== confirmDeleteCol),
          cards: boardData.cards.filter((c) => c.columnId !== confirmDeleteCol),
        });
      }
      toast.success(t("campaigns.toastDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmDeleteCol(null);
    }
  };

  // ----- Cards -----
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim()) return;

    const dueTs = cardDueAt ? new Date(cardDueAt).getTime() : undefined;

    try {
      if (editingCard) {
        const input: kanbanApi.UpdateCardInput = {
          title: cardTitle,
          description: cardDesc,
          color: cardColor,
          sessionId: cardSessionId || undefined,
          chatJid: cardChatJid || undefined,
          dueAt: dueTs,
        };
        const updated = await kanbanApi.updateCard(editingCard.id, input);
        // Put request returns void usually, so we fetch full board or map it
        toast.success(t("common.save"));
        void loadBoard();
      } else {
        const input: kanbanApi.CreateCardInput = {
          columnId: targetColId,
          title: cardTitle,
          description: cardDesc,
          color: cardColor,
          sessionId: cardSessionId || undefined,
          chatJid: cardChatJid || undefined,
          dueAt: dueTs,
        };
        const newCard = await kanbanApi.createCard(boardId, input);
        if (boardData) {
          setBoardData({
            ...boardData,
            cards: [...boardData.cards, newCard],
          });
        }
        toast.success(t("queues.createdToast"));
      }
      setCardModalOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleOpenAddCard = (colId: string) => {
    setEditingCard(null);
    setTargetColId(colId);
    setCardTitle("");
    setCardDesc("");
    setCardColor("#3b82f6");
    setCardSessionId("");
    setCardChatJid("");
    setCardDueAt("");
    setCardModalOpen(true);
  };

  const handleOpenEditCard = (card: KanbanCard) => {
    setEditingCard(card);
    setCardTitle(card.title);
    setCardDesc(card.description || "");
    setCardColor(card.color || "#3b82f6");
    setCardSessionId(card.sessionId || "");
    setCardChatJid(card.chatJid || "");
    setCardDueAt(card.dueAt ? new Date(card.dueAt).toISOString().split("T")[0] : "");
    setCardModalOpen(true);
  };

  const handleDeleteCard = async () => {
    if (!confirmDeleteCard) return;
    try {
      await kanbanApi.deleteCard(confirmDeleteCard);
      if (boardData) {
        setBoardData({
          ...boardData,
          cards: boardData.cards.filter((c) => c.id !== confirmDeleteCard),
        });
      }
      toast.success(t("campaigns.toastDeleted"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmDeleteCard(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className="flex h-64 flex-col items-center justify-center border border-dashed rounded-2xl p-6 text-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-lg">{t("common.empty")}</h3>
        <p className="text-muted-foreground text-sm mt-1">Quadro não carregado.</p>
      </div>
    );
  }

  const columns = [...boardData.columns].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Board controls */}
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-lg font-semibold text-foreground truncate max-w-[60%]">
          {boardData.board.name}
        </h2>
        <Button size="sm" onClick={handleOpenAddCol}>
          <Plus className="h-4 w-4 mr-1" />
          {t("actions.new")} Coluna
        </Button>
      </div>

      {/* Board columns grid scrollable */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start scrollbar-thin">
        {columns.map((col) => (
          <KanbanColumnComponent
            key={col.id}
            column={col}
            cards={boardData.cards.filter((c) => c.columnId === col.id)}
            onMoveCard={handleMoveCard}
            onEditColumn={handleOpenEditCol}
            onDeleteColumn={setConfirmDeleteCol}
            onAddCard={handleOpenAddCard}
            onEditCard={handleOpenEditCard}
            onDeleteCard={setConfirmDeleteCard}
          />
        ))}
        {columns.length === 0 && (
          <div className="w-full flex flex-col items-center justify-center border border-dashed rounded-xl py-12 text-center">
            <LayoutGrid className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma coluna criada ainda.</p>
          </div>
        )}
      </div>

      {/* Column creation/edition modal */}
      <Dialog open={colModalOpen} onOpenChange={setColModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCol ? t("common.edit") : t("actions.create")} Coluna
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveColumn} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t("common.name")}</Label>
              <Input
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="Ex: Novos Leads"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>{t("common.color")}</Label>
              <Input
                type="color"
                value={colColor}
                onChange={(e) => setColColor(e.target.value)}
                className="h-10 w-20 px-1"
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo da Etapa</Label>
              <Select value={colStageType} onValueChange={(val) => setColStageType(val as StageType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ativo</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setColModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card creation/edition modal */}
      <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCard ? t("common.edit") : t("actions.create")} Card
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t("common.name")}</Label>
              <Input
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="Ex: Reunião com cliente"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                value={cardDesc}
                onChange={(e) => setCardDesc(e.target.value)}
                placeholder="Detalhes adicionais do lead"
              />
            </div>
            <div className="space-y-1">
              <Label>Cor do Card</Label>
              <Input
                type="color"
                value={cardColor}
                onChange={(e) => setCardColor(e.target.value)}
                className="h-10 w-20 px-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Instância Zap</Label>
                <Select value={cardSessionId} onValueChange={setCardSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Telefone / JID</Label>
                <Input
                  value={cardChatJid}
                  onChange={(e) => setCardChatJid(e.target.value)}
                  placeholder="ex: 5511999999999"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={cardDueAt}
                onChange={(e) => setCardDueAt(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCardModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        open={!!confirmDeleteCol}
        onOpenChange={(o) => !o && setConfirmDeleteCol(null)}
        title={t("queues.deleteTitle")}
        description={t("queues.deleteDescription", { name: boardData.columns.find((c) => c.id === confirmDeleteCol)?.name || "" })}
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={handleDeleteColumn}
      />

      <ConfirmDialog
        open={!!confirmDeleteCard}
        onOpenChange={(o) => !o && setConfirmDeleteCard(null)}
        title={t("contacts.delete")}
        description="Esta ação excluirá o card permanentemente do funil."
        confirmLabel={t("common.delete")}
        destructive
        onConfirm={handleDeleteCard}
      />
    </div>
  );
};
