"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "./task-card";

interface StatusDefinition {
  id: string;
  name: string;
  color: string;
  category: "NOT_STARTED" | "ACTIVE" | "DONE";
  position: number;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface AssigneeUser {
  id: string;
  name?: string | null;
  image?: string | null;
  email: string;
}

interface TaskAssignment {
  user: AssigneeUser;
}

interface Subtask {
  id: string;
  statusId: string;
}

interface KanbanTask {
  id: string;
  number: number;
  title: string;
  priority: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  statusId: string;
  dueDate?: Date | string | null;
  estimate?: number | null;
  assignments: TaskAssignment[];
  taskLabels: { label: Label }[];
  subtasks: Subtask[];
  project: { taskPrefix: string };
}

interface KanbanBoardProps {
  statuses: StatusDefinition[];
  tasks: KanbanTask[];
  onTaskMove: (taskId: string, newStatusId: string) => void;
  onTaskClick: (taskId: string) => void;
  onAddTask: (statusId: string) => void;
}

export function KanbanBoard({
  statuses,
  tasks,
  onTaskMove,
  onTaskClick,
  onAddTask,
}: KanbanBoardProps) {
  const sortedStatuses = [...statuses].sort((a, b) => a.position - b.position);

  const tasksByStatus = sortedStatuses.reduce<Record<string, KanbanTask[]>>((acc, status) => {
    acc[status.id] = tasks.filter((t) => t.statusId === status.id);
    return acc;
  }, {});

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatusId = destination.droppableId;
    onTaskMove(draggableId, newStatusId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 h-full overflow-x-auto pb-4 px-4">
        {sortedStatuses.map((status) => {
          const columnTasks = tasksByStatus[status.id] ?? [];
          return (
            <div
              key={status.id}
              className="flex flex-col shrink-0 w-[272px] rounded bg-[var(--secondary)]"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm font-medium text-[var(--foreground)] flex-1 truncate">
                  {status.name}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">
                  {columnTasks.length}
                </span>
              </div>

              {/* Cards */}
              <Droppable droppableId={status.id}>
                {(provided, snapshot) => (
                  <ScrollArea className="flex-1">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex flex-col gap-2 p-2 min-h-[60px] transition-colors",
                        snapshot.isDraggingOver && "bg-[var(--sidebar-accent)]"
                      )}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                dragSnapshot.isDragging && "opacity-80 rotate-1"
                              )}
                              onClick={() => onTaskClick(task.id)}
                            >
                              <TaskCard task={task} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>

              {/* Add task */}
              <div className="p-2 border-t border-[var(--border)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddTask(status.id)}
                  className="w-full justify-start gap-1.5 h-7 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <Plus size={13} />
                  Add task
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
