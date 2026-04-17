import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DropAnimation,
} from "@dnd-kit/core";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, GripVertical, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KanbanTask = {
  id: number;
  title: string;
  status: string;
  type?: string;
  priority?: string;
  owner_name?: string;
  due_date?: string;
};

export type KanbanColumnId = "solicitacoes" | "em_andamento" | "revisao" | "entregue";

const COLUMNS: { id: KanbanColumnId; title: string; hint: string; accent: string }[] = [
  { id: "solicitacoes", title: "Solicitações", hint: "Backlog", accent: "bg-tag-blue" },
  { id: "em_andamento", title: "Em andamento", hint: "Em execução", accent: "bg-tag-amber" },
  { id: "revisao", title: "Revisão", hint: "QA / ajustes", accent: "bg-tag-purple" },
  { id: "entregue", title: "Entregue", hint: "Concluído", accent: "bg-tag-green" },
];

function canonicalStatus(raw: string | undefined | null): KanbanColumnId {
  const n = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  if (/^(entregue|done|concluido)$/.test(n)) return "entregue";
  if (/^(revisao)$/.test(n)) return "revisao";
  if (/^(em_andamento|emandamento)$/.test(n)) return "em_andamento";
  return "solicitacoes";
}

function taskDragId(taskId: number) {
  return `task-${taskId}`;
}

function parseTaskDragId(id: string | number): number | null {
  const s = String(id);
  if (!s.startsWith("task-")) return null;
  const n = Number(s.slice(5));
  return Number.isFinite(n) ? n : null;
}

function columnDropId(col: KanbanColumnId) {
  return `column-${col}`;
}

function parseColumnDropId(id: string | number): KanbanColumnId | null {
  const s = String(id);
  if (!s.startsWith("column-")) return null;
  const rest = s.slice(7) as KanbanColumnId;
  return COLUMNS.some((c) => c.id === rest) ? rest : null;
}

function groupTasksByColumn(tasks: KanbanTask[]): Record<KanbanColumnId, KanbanTask[]> {
  const empty: Record<KanbanColumnId, KanbanTask[]> = {
    solicitacoes: [],
    em_andamento: [],
    revisao: [],
    entregue: [],
  };
  for (const t of tasks) {
    const col = canonicalStatus(t.status);
    empty[col].push({ ...t, status: col });
  }
  return empty;
}

function priorityVisual(priority: string | undefined) {
  const p = (priority || "Média").trim().toLowerCase();
  if (p.includes("alt")) {
    return {
      bar: "border-l-4 border-l-tag-red",
      badge: "border-transparent bg-tag-red-bg text-tag-red",
      label: "Alta",
    };
  }
  if (p.includes("baix")) {
    return {
      bar: "border-l-4 border-l-tag-cyan",
      badge: "border-transparent bg-tag-cyan-bg text-tag-cyan",
      label: "Baixa",
    };
  }
  return {
    bar: "border-l-4 border-l-tag-amber",
    badge: "border-transparent bg-tag-amber-bg text-tag-amber",
    label: "Média",
  };
}

function getDueMeta(dueRaw: string | undefined | null, column: KanbanColumnId) {
  if (!dueRaw) return null;
  const d = new Date(dueRaw);
  if (Number.isNaN(d.getTime())) return null;
  const day = startOfDay(d);
  const today = startOfDay(new Date());
  const overdue = column !== "entregue" && isBefore(day, today);
  const label = format(d, "d MMM yyyy", { locale: ptBR });
  const weekday = format(d, "EEEE", { locale: ptBR });
  return { label, weekday, overdue };
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.45" } },
  }),
};

const DEFAULT_EMPTY_HINT_ADMIN =
  "Arraste um cartão de outra coluna para atualizar o status.";
const DEFAULT_EMPTY_HINT_READ_ONLY =
  "Quando você enviar uma nova solicitação, o cartão aparecerá na coluna Solicitações.";

export function ProducaoKanban({
  tasks,
  loading,
  onMoveTask,
  onEditTask,
  readOnly = false,
  emptyColumnHint,
}: {
  tasks: KanbanTask[];
  loading: boolean;
  onMoveTask?: (taskId: number, newStatus: KanbanColumnId) => Promise<void>;
  onEditTask?: (task: KanbanTask) => void;
  readOnly?: boolean;
  emptyColumnHint?: string;
}) {
  const grouped = useMemo(() => groupTasksByColumn(tasks), [tasks]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const resolvedEmptyHint =
    emptyColumnHint ?? (readOnly ? DEFAULT_EMPTY_HINT_READ_ONLY : DEFAULT_EMPTY_HINT_ADMIN);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    const id = parseTaskDragId(activeId);
    if (id == null) return null;
    return tasks.find((t) => t.id === id) ?? null;
  }, [activeId, tasks]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const draggedId = parseTaskDragId(e.active.id);
    setActiveId(null);
    if (draggedId == null || !e.over) return;

    let targetCol = parseColumnDropId(e.over.id);
    if (!targetCol) {
      const overTaskId = parseTaskDragId(e.over.id);
      if (overTaskId != null) {
        const other = tasks.find((t) => t.id === overTaskId);
        targetCol = other ? canonicalStatus(other.status) : null;
      }
    }
    if (!targetCol) return;

    const task = tasks.find((t) => t.id === draggedId);
    if (!task) return;
    if (canonicalStatus(task.status) === targetCol) return;

    await onMoveTask?.(draggedId, targetCol);
  };

  if (readOnly) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 min-h-[min(72vh,760px)]">
        {COLUMNS.map((col) => (
          <ReadOnlyKanbanColumn
            key={col.id}
            column={col}
            tasks={grouped[col.id]}
            loading={loading}
            emptyHint={resolvedEmptyHint}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={(e) => void handleDragEnd(e)}
      onDragCancel={() => setActiveId(null)}
      dropAnimation={dropAnimation}
    >
      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 min-h-[min(72vh,760px)]">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={grouped[col.id]}
            loading={loading}
            onEditTask={onEditTask}
            emptyHint={resolvedEmptyHint}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <TaskCardStatic
            task={activeTask}
            column={canonicalStatus(activeTask.status)}
            className="w-[min(100vw-2rem,340px)] cursor-grabbing shadow-card-hover ring-2 ring-primary/25"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  tasks,
  loading,
  onEditTask,
  emptyHint,
}: {
  column: (typeof COLUMNS)[number];
  tasks: KanbanTask[];
  loading: boolean;
  onEditTask?: (task: KanbanTask) => void;
  emptyHint: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(column.id) });

  return (
    <div className="flex min-w-[min(100vw-2rem,320px)] max-w-[360px] flex-1 flex-col rounded-2xl border border-border bg-surface-1/90 shadow-card">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", column.accent)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-text-1">{column.title}</p>
            <p className="text-[11px] text-text-3">{column.hint}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-3 overflow-y-auto p-3 min-h-[240px] rounded-b-2xl transition-colors",
          isOver && "bg-primary/[0.06] ring-1 ring-inset ring-primary/25",
        )}
      >
        {loading && tasks.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-text-3">Carregando…</p>
        ) : (
          tasks.map((t) => <DraggableTaskCard key={t.id} task={t} column={column.id} onEditTask={onEditTask} />)
        )}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-2">Nada aqui ainda</p>
            <p className="max-w-[220px] text-xs leading-relaxed text-text-3">{emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadOnlyKanbanColumn({
  column,
  tasks,
  loading,
  emptyHint,
}: {
  column: (typeof COLUMNS)[number];
  tasks: KanbanTask[];
  loading: boolean;
  emptyHint: string;
}) {
  return (
    <div className="flex min-w-[min(100vw-2rem,320px)] max-w-[360px] flex-1 flex-col rounded-2xl border border-border bg-surface-1/90 shadow-card">
      <div className="shrink-0 border-b border-border-subtle px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", column.accent)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-text-1">{column.title}</p>
            <p className="text-[11px] text-text-3">{column.hint}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold tabular-nums">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 min-h-[240px] rounded-b-2xl">
        {loading && tasks.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-text-3">Carregando…</p>
        ) : (
          tasks.map((t) => <StaticTaskCard key={t.id} task={t} column={column.id} />)
        )}
        {!loading && tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm font-medium text-text-2">Nada aqui ainda</p>
            <p className="max-w-[220px] text-xs leading-relaxed text-text-3">{emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableTaskCard({
  task,
  column,
  onEditTask,
}: {
  task: KanbanTask;
  column: KanbanColumnId;
  onEditTask?: (task: KanbanTask) => void;
}) {
  const id = taskDragId(task.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.22 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-manipulation">
      <TaskCardStatic task={task} column={column} dragListeners={listeners} dragAttributes={attributes} onEditTask={onEditTask} />
    </div>
  );
}

function StaticTaskCard({ task, column }: { task: KanbanTask; column: KanbanColumnId }) {
  return (
    <div className="touch-manipulation">
      <TaskCardStatic task={task} column={column} />
    </div>
  );
}

function TaskCardMain({
  task,
  pv,
  due,
  typeLabel,
  dueEmptySubtext,
}: {
  task: KanbanTask;
  pv: ReturnType<typeof priorityVisual>;
  due: ReturnType<typeof getDueMeta>;
  typeLabel: string;
  dueEmptySubtext: string;
}): ReactNode {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-text-2">
          #{task.id}
        </span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", pv.badge)}>{pv.label}</span>
        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-text-2">{typeLabel}</span>
      </div>

      <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-text-1">{task.title}</h3>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
            due?.overdue ? "border-tag-red/40 bg-tag-red-bg/80 text-tag-red" : "border-border-subtle bg-surface-2/80 text-text-2",
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 opacity-80" />
          <div className="min-w-0 leading-tight">
            {due ? (
              <>
                <p className="font-semibold capitalize text-text-1">{due.weekday}</p>
                <p className="text-[11px] text-text-2">{due.label}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-text-2">Sem prazo</p>
                <p className="text-[11px] text-text-3">{dueEmptySubtext}</p>
              </>
            )}
          </div>
        </div>
        {due?.overdue && (
          <Badge variant="destructive" className="w-fit shrink-0 rounded-lg text-[10px]">
            Atrasada
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border-subtle pt-3 text-xs text-text-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-text-3">Responsável</p>
          <p className="truncate font-medium text-text-1">{task.owner_name?.trim() || "Sem responsável"}</p>
        </div>
      </div>
    </>
  );
}

function TaskCardStatic({
  task,
  column,
  className,
  dragListeners,
  dragAttributes,
  onEditTask,
}: {
  task: KanbanTask;
  column: KanbanColumnId;
  className?: string;
  dragListeners?: DraggableSyntheticListeners;
  dragAttributes?: DraggableAttributes;
  onEditTask?: (task: KanbanTask) => void;
}) {
  const pv = priorityVisual(task.priority);
  const due = getDueMeta(task.due_date, column);
  const typeLabel = (task.type || "Geral").trim() || "Geral";
  const dueEmptySubtext = onEditTask ? "Defina uma data na edição" : "A equipe pode definir um prazo";

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-border/90 bg-card shadow-card transition-shadow hover:shadow-card-hover",
        pv.bar,
        className,
      )}
    >
      <CardContent className="p-0">
        <div className="flex gap-0">
          {dragListeners && dragAttributes ? (
            <button
              type="button"
              className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-border/60 bg-muted/35 text-text-3 hover:bg-muted/55 hover:text-text-2"
              aria-label="Arrastar tarefa"
              {...dragAttributes}
              {...dragListeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : (
            <div
              className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-border/60 bg-muted/20 text-text-4"
              aria-hidden
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          {onEditTask ? (
            <button
              type="button"
              className="min-w-0 flex-1 cursor-pointer space-y-3 p-4 pr-3 text-left"
              onClick={() => onEditTask(task)}
            >
              <TaskCardMain task={task} pv={pv} due={due} typeLabel={typeLabel} dueEmptySubtext={dueEmptySubtext} />
            </button>
          ) : (
            <div className="min-w-0 flex-1 space-y-3 p-4 pr-3 text-left">
              <TaskCardMain task={task} pv={pv} due={due} typeLabel={typeLabel} dueEmptySubtext={dueEmptySubtext} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
