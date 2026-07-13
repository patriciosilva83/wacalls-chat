import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Edit2, Trash2 } from "lucide-react";
import type { KanbanCard, KanbanColumn } from "@/types/kanban";
import { KanbanCardComponent } from "./KanbanCard";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
  column: KanbanColumn;
  cards: KanbanCard[];
  onMoveCard: (cardId: string, columnId: string, position: number) => void;
  onEditColumn: (column: KanbanColumn) => void;
  onDeleteColumn: (id: string) => void;
  onAddCard: (columnId: string) => void;
  onEditCard: (card: KanbanCard) => void;
  onDeleteCard: (id: string) => void;
}

export const KanbanColumnComponent = ({
  column,
  cards,
  onMoveCard,
  onEditColumn,
  onDeleteColumn,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: KanbanColumnProps) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  // Sort cards by position
  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId) return;
    
    // Move card to the bottom of the column (new position = count of cards)
    onMoveCard(cardId, column.id, sortedCards.length);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-72 shrink-0 rounded-xl bg-muted/40 border p-3 min-h-[500px] transition-colors ${
        isDragOver ? "bg-muted/70 border-primary/30" : "border-border/50"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: column.color || "#888" }} />
          <h3 className="font-semibold text-sm truncate text-foreground">{column.name}</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
            {sortedCards.length}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEditColumn(column)}
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
            aria-label={t("common.edit")}
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Cards Scrollable list */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-0.5 pb-4">
        {sortedCards.map((card) => (
          <KanbanCardComponent
            key={card.id}
            card={card}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
          />
        ))}
      </div>

      {/* Add Card Footer */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAddCard(column.id)}
        className="w-full justify-start text-xs text-muted-foreground hover:text-foreground mt-2 shrink-0"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        {t("actions.new")} Card
      </Button>
    </div>
  );
};
