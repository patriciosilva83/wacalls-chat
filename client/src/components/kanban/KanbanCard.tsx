import { useTranslation } from "react-i18next";
import { MessageSquare, Calendar, User, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { KanbanCard } from "@/types/kanban";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  card: KanbanCard;
  onEdit: (card: KanbanCard) => void;
  onDelete: (id: string) => void;
}

export const KanbanCardComponent = ({ card, onEdit, onDelete }: KanbanCardProps) => {
  const { t } = useTranslation();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", card.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const formatDate = (ts?: number) => {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEdit(card)}
      className="group relative cursor-grab rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow active:cursor-grabbing select-none"
      style={{ borderLeftWidth: "4px", borderLeftColor: card.color || "var(--primary)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-tight text-foreground truncate max-w-[85%]">
          {card.title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {card.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {card.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
        {card.chatJid && card.sessionId && (
          <Link
            to={`/chats?sid=${encodeURIComponent(card.sessionId)}&jid=${encodeURIComponent(card.chatJid)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium hover:bg-primary/20 transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            <span>Chat</span>
          </Link>
        )}

        {card.dueAt && (
          <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(card.dueAt)}</span>
          </div>
        )}

        {card.assigneeId && (
          <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[60px]">{card.assigneeId.split("@")[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
};
