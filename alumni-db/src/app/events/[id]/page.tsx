"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import PrintButton from "@/components/PrintButton";
import PrintHeader from "@/components/PrintHeader";

interface Task {
  id: number;
  title: string;
  description: string;
  section: string;
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
  const [taskForm, setTaskForm] = useState({ title: "", description: "", section: "", assignee: "", priority: "medium", due_date: "" });
  const [showMinuteForm, setShowMinuteForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newSection, setNewSection] = useState("");
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [boardMembers, setBoardMembers] = useState<{ id: number; full_name: string }[]>([]);

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
    fetch("/api/members?role=board_and_admin").then((r) => r.json()).then(setBoardMembers);
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
    setTaskForm({ title: "", description: "", section: taskForm.section, assignee: "", priority: "medium", due_date: "" });
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

  const sections = [...new Set(tasks.map((t) => t.section || "General"))].sort();
  if (sections.length === 0) sections.push("General");

  function addSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.trim()) return;
    setShowSectionForm(false);
    setNewSection("");
    // Just set the task form to use this section
    setTaskForm((f) => ({ ...f, section: newSection.trim() }));
    setShowTaskForm(true);
  }

  const statusColors: Record<string, string> = {
    todo: "bg-gray-100 text-gray-600",
    in_progress: "bg-yellow-100 text-yellow-800",
    done: "bg-green-100 text-green-800",
  };
  const statusLabels: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-orange-100 text-orange-700",
    low: "bg-blue-100 text-blue-700",
  };

  if (!event) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <PrintHeader title={event.type === "project" ? "Project" : "Event"} subtitle={event.name} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs font-medium text-gray-500 uppercase mb-1">{event.type}</div>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
        </div>
        <div className="flex gap-2">
          <PrintButton label="Save PDF" />
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Sections & Tasks */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sections & Tasks</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowSectionForm(!showSectionForm)} className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              + Section
            </button>
            <button onClick={() => { setTaskForm((f) => ({ ...f, section: "" })); setShowTaskForm(!showTaskForm); }} className="px-3 py-1.5 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">
              + Task
            </button>
          </div>
        </div>

        {showSectionForm && (
          <form onSubmit={addSection} className="bg-gray-50 rounded-md p-4 mb-4 flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Section Name</label>
              <input type="text" required value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="e.g. Planning, Logistics, Marketing" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-[#c9a227] text-white rounded-md text-sm hover:bg-[#b08f1f]">Create & Add Task</button>
          </form>
        )}

        {showTaskForm && (
          <form onSubmit={handleAddTask} className="bg-gray-50 rounded-md p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" required placeholder="Task title" value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <select value={taskForm.section} onChange={(e) => setTaskForm((f) => ({ ...f, section: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">General</option>
                {sections.filter((s) => s !== "General").map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <textarea placeholder="Description (optional)" rows={2} value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={taskForm.assignee} onChange={(e) => setTaskForm((f) => ({ ...f, assignee: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="">Assigned to</option>
                {boardMembers.map((m) => <option key={m.id} value={m.full_name}>{m.full_name}</option>)}
              </select>
              <select value={taskForm.priority} onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input type="date" placeholder="Due date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="px-4 py-2 bg-[#1a3a7a] text-white rounded-md text-sm hover:bg-[#0f2654]">Add Task</button>
          </form>
        )}

        {sections.map((section) => {
          const sectionTasks = tasks.filter((t) => (t.section || "General") === section);
          if (sectionTasks.length === 0 && section === "General" && sections.length > 1) return null;
          const doneCount = sectionTasks.filter((t) => t.status === "done").length;
          const progress = sectionTasks.length > 0 ? Math.round((doneCount / sectionTasks.length) * 100) : 0;

          return (
            <div key={section} className="bg-white rounded-lg shadow mb-4">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{section}</h3>
                  <span className="text-xs text-gray-400">{sectionTasks.length} task{sectionTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span>{progress}%</span>
                  </div>
                  <button onClick={() => { setTaskForm((f) => ({ ...f, section })); setShowTaskForm(true); }} className="text-xs text-[#1a3a7a] hover:underline">+ Task</button>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {sectionTasks.map((task) => (
                  <div key={task.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
                    <button
                      onClick={() => moveTask(task.id, task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo")}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        task.status === "done" ? "bg-green-500 border-green-500 text-white" :
                        task.status === "in_progress" ? "border-yellow-400 bg-yellow-50" : "border-gray-300"
                      }`}
                    >
                      {task.status === "done" && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${task.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>{task.title}</div>
                      {task.description && <div className="text-xs text-gray-400 truncate">{task.description}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.assignee && <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{task.assignee}</span>}
                      {task.due_date && <span className="text-xs text-gray-400">{task.due_date}</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[task.status]}`}>{statusLabels[task.status]}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColors[task.priority]}`}>{task.priority}</span>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 text-sm">&times;</button>
                    </div>
                  </div>
                ))}
                {sectionTasks.length === 0 && (
                  <div className="px-5 py-4 text-center text-gray-400 text-xs">No tasks in this section</div>
                )}
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && !showTaskForm && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400 text-sm">No sections or tasks yet. Add a section to get started.</div>
        )}
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
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
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
          </table></div>
        </div>
      )}
    </div>
  );
}
