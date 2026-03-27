"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  due_date: string;
}

interface EventDetail {
  id: number;
  name: string;
  description: string;
  date: string;
  type: string;
  status: string;
  minutes: { id: number; date: string; content: string }[];
  goals: { id: number; description: string; status: string; minute_id: number }[];
  expenditures: { id: number; description: string; amount: number; date: string; remarks: string }[];
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", date: "", type: "", status: "" });
  const [minuteForm, setMinuteForm] = useState({ date: "", content: "" });
  const [goalForm, setGoalForm] = useState({ description: "", minute_id: "" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assignee: "", priority: "medium", due_date: "" });
  const [showMinuteForm, setShowMinuteForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  async function load() {
    const [eventRes, tasksRes] = await Promise.all([
      fetch(`/api/events/${id}`),
      fetch(`/api/events/${id}/tasks`),
    ]);
    if (eventRes.ok) {
      const data = await eventRes.json();
      setEvent(data);
      setForm({
        name: data.name,
        description: data.description || "",
        date: data.date,
        type: data.type,
        status: data.status,
      });
    }
    if (tasksRes.ok) {
      setTasks(await tasksRes.json());
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave() {
    await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this event/project?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    router.push(event?.type === "project" ? "/projects" : "/events");
  }

  async function handleAddMinute(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/events/${id}/minutes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(minuteForm),
    });
    setShowMinuteForm(false);
    setMinuteForm({ date: "", content: "" });
    load();
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/events/${id}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: goalForm.description,
        minute_id: goalForm.minute_id ? Number(goalForm.minute_id) : null,
      }),
    });
    setShowGoalForm(false);
    setGoalForm({ description: "", minute_id: "" });
    load();
  }

  async function toggleGoalStatus(goalId: number, current: string) {
    const next = current === "pending" ? "in_progress" : current === "in_progress" ? "completed" : "pending";
    await fetch(`/api/events/${id}/goals`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_id: goalId, status: next }),
    });
    load();
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/events/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskForm),
    });
    setShowTaskForm(false);
    setTaskForm({ title: "", description: "", assignee: "", priority: "medium", due_date: "" });
    load();
  }

  async function moveTask(taskId: number, newStatus: string) {
    await fetch(`/api/events/${id}/tasks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, status: newStatus }),
    });
    load();
  }

  async function deleteTask(taskId: number) {
    await fetch(`/api/events/${id}/tasks`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId }),
    });
    load();
  }

  const columns = [
    { key: "todo", label: "To Do", color: "bg-gray-100" },
    { key: "in_progress", label: "In Progress", color: "bg-yellow-50" },
    { key: "done", label: "Done", color: "bg-green-50" },
  ];

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-orange-100 text-orange-700",
    low: "bg-blue-100 text-blue-700",
  };

  if (!event) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">{event.type}</div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(!editing)} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
            {editing ? "Cancel" : "Edit"}
          </button>
          <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>

      {/* Event Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {editing ? (
          <div className="space-y-4">
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Name" />
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Description" />
            <div className="grid grid-cols-3 gap-4">
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="event">Event</option>
                <option value="project">Project</option>
              </select>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button onClick={handleSave} className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">Save Changes</button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-3">{event.description || "No description"}</p>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">Date: {event.date}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                event.status === "upcoming" ? "bg-blue-100 text-blue-800" :
                event.status === "ongoing" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
              }`}>{event.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Task Board */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Task Board</h2>
          <button onClick={() => setShowTaskForm(!showTaskForm)} className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
            Add Task
          </button>
        </div>

        {showTaskForm && (
          <form onSubmit={handleAddTask} className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
            <input type="text" required placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <textarea placeholder="Description (optional)" rows={2} value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <input type="text" placeholder="Assignee" value={taskForm.assignee} onChange={(e) => setTaskForm((f) => ({ ...f, assignee: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">Add Task</button>
          </form>
        )}

        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.key} className={`${col.color} rounded-lg p-3 min-h-[200px]`}>
              <div className="font-medium text-sm text-gray-700 mb-3 flex items-center justify-between">
                {col.label}
                <span className="bg-white px-2 py-0.5 rounded-full text-xs text-gray-500">
                  {tasks.filter((t) => t.status === col.key).length}
                </span>
              </div>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((task) => (
                    <div key={task.id} className="bg-white rounded-md p-3 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{task.title}</span>
                        <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 text-xs ml-2">&times;</button>
                      </div>
                      {task.description && <p className="text-xs text-gray-500 mb-2">{task.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                        {task.due_date && <span className="text-xs text-gray-400">{task.due_date}</span>}
                      </div>
                      <div className="flex gap-1 mt-2">
                        {col.key !== "todo" && (
                          <button onClick={() => moveTask(task.id, col.key === "done" ? "in_progress" : "todo")} className="text-xs text-gray-400 hover:text-gray-600">&larr;</button>
                        )}
                        {col.key !== "done" && (
                          <button onClick={() => moveTask(task.id, col.key === "todo" ? "in_progress" : "done")} className="text-xs text-gray-400 hover:text-gray-600">&rarr;</button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting Minutes */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Meeting Minutes</h2>
          <button onClick={() => setShowMinuteForm(!showMinuteForm)} className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
            Add Minutes
          </button>
        </div>

        {showMinuteForm && (
          <form onSubmit={handleAddMinute} className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
            <input type="date" required value={minuteForm.date} onChange={(e) => setMinuteForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <textarea required placeholder="Meeting minutes content..." rows={6} value={minuteForm.content} onChange={(e) => setMinuteForm((f) => ({ ...f, content: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">Save</button>
          </form>
        )}

        {event.minutes.map((m) => (
          <div key={m.id} className="border-b border-gray-100 py-3 last:border-0">
            <div className="text-xs text-gray-500 mb-1">{m.date} (ID: {m.id})</div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {event.minutes.length === 0 && <div className="text-gray-400 text-sm">No minutes recorded</div>}
      </div>

      {/* Goals */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
          <button onClick={() => setShowGoalForm(!showGoalForm)} className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
            Add Goal
          </button>
        </div>

        {showGoalForm && (
          <form onSubmit={handleAddGoal} className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
            <input type="text" required placeholder="Goal description" value={goalForm.description} onChange={(e) => setGoalForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <select value={goalForm.minute_id} onChange={(e) => setGoalForm((f) => ({ ...f, minute_id: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Link to minute (optional)</option>
              {event.minutes.map((m) => (
                <option key={m.id} value={m.id}>{m.date} - {m.content.substring(0, 50)}...</option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">Save</button>
          </form>
        )}

        {event.goals.map((g) => (
          <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span className={`text-sm ${g.status === "completed" ? "line-through text-gray-400" : "text-gray-700"}`}>{g.description}</span>
            <button
              onClick={() => toggleGoalStatus(g.id, g.status)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                g.status === "pending" ? "bg-gray-100 text-gray-600" :
                g.status === "in_progress" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
              }`}
            >
              {g.status}
            </button>
          </div>
        ))}
        {event.goals.length === 0 && <div className="text-gray-400 text-sm">No goals set</div>}
      </div>

      {/* Event Expenditures */}
      {event.expenditures.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expenditures</h2>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {event.expenditures.map((exp) => (
                <tr key={exp.id}>
                  <td className="px-3 py-2 text-sm">{exp.date}</td>
                  <td className="px-3 py-2 text-sm">{exp.description}</td>
                  <td className="px-3 py-2 text-sm">₱{exp.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
