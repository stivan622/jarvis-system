import { WeekView } from "@/components/schedule/week-view";
import { TaskPanel } from "@/components/schedule/task-panel";

export default function SchedulePage() {
  return (
    <div className="-m-6 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <TaskPanel />
      <div className="min-w-0 flex-1 overflow-hidden">
        <WeekView />
      </div>
    </div>
  );
}
