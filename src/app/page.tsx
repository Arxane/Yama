
"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  completed: boolean;
  createdAt: string;
};

type Page = "Home" | "Calendar" | "Tasks" | "Goals";
type TaskFilter = "All" | "Today" | "Upcoming" | "Completed";

const STORAGE_KEY = "yama-tasks-v1";

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  if (!date) return "No date";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const navigation: { name: Page; icon: string }[] = [
  { name: "Home", icon: "⌂" },
  { name: "Calendar", icon: "▦" },
  { name: "Tasks", icon: "✓" },
  { name: "Goals", icon: "◎" },
];

export default function HomePage() {
  const [page, setPage] = useState<Page>("Home");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [showForm, setShowForm] = useState(false);

  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(localDate(new Date()));
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setTasks(parsed as Task[]);
      }
    } catch {
      console.error("Could not load saved Yama tasks.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      console.error("Could not save Yama tasks.");
    }
  }, [tasks, hydrated]);

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.dueDate === today),
    [tasks, today]
  );

  const completedToday = todayTasks.filter((task) => task.completed).length;
  const completedTotal = tasks.filter((task) => task.completed).length;
  const progress = todayTasks.length
    ? Math.round((completedToday / todayTasks.length) * 100)
    : 0;

  const visibleTasks = useMemo(() => {
    const result = tasks.filter((task) => {
      if (filter === "Today") return task.dueDate === today;
      if (filter === "Upcoming")
        return task.dueDate > today && !task.completed;
      if (filter === "Completed") return task.completed;
      return true;
    });

    return result.sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      return (
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        a.dueDate.localeCompare(b.dueDate)
      );
    });
  }, [tasks, filter, today]);

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanTitle,
      dueDate,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTasks((current) => [task, ...current]);
    setTitle("");
    setDueDate(today);
    setPriority("Medium");
    setShowForm(false);
    setFilter("All");
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function deleteTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function openTasks() {
    setPage("Tasks");
    setShowForm(true);
  }

  function TaskList({ items }: { items: Task[] }) {
    if (!items.length) {
      return (
        <div className="rounded-2xl border border-dashed border-stone-300 px-5 py-10 text-center">
          <div className="text-2xl text-stone-400">✓</div>
          <p className="mt-3 font-medium text-stone-700">Nothing here yet</p>
          <p className="mt-1 text-sm text-stone-500">
            Add a task and it will appear here.
          </p>
          <button
            onClick={openTasks}
            className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + Add a task
          </button>
        </div>
      );
    }

    return (
      <div className="divide-y divide-stone-100">
        {items.map((task) => (
          <div key={task.id} className="flex items-center gap-3 py-4">
            <button
              aria-label={task.completed ? "Mark incomplete" : "Complete task"}
              onClick={() => toggleTask(task.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                task.completed
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-stone-300 hover:border-stone-700"
              }`}
            >
              {task.completed ? <span className="text-xs">✓</span> : null}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`break-words text-sm font-medium ${
                  task.completed ? "text-stone-400 line-through" : "text-stone-800"
                }`}
              >
                {task.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>{formatDate(task.dueDate)}</span>
                <span>·</span>
                <span
                  className={
                    task.priority === "High"
                      ? "font-medium text-rose-600"
                      : task.priority === "Medium"
                        ? "text-amber-700"
                        : "text-stone-500"
                  }
                >
                  {task.priority} priority
                </span>
              </div>
            </div>

            <button
              onClick={() => deleteTask(task.id)}
              aria-label={`Delete ${task.title}`}
              title="Delete task"
              className="rounded-lg px-2 py-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-200 bg-white px-5 py-7 md:flex">
          <button
            onClick={() => setPage("Home")}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-lg font-semibold text-white">
              y.
            </div>
            <div>
              <p className="text-xl font-semibold tracking-tight">Yama</p>
              <p className="text-xs text-stone-500">Your life, in focus.</p>
            </div>
          </button>

          <p className="mb-3 mt-12 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Workspace
          </p>
          <nav className="space-y-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => setPage(item.name)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  page === item.name
                    ? "bg-stone-900 font-medium text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.name}
                {item.name === "Tasks" && tasks.filter((t) => !t.completed).length > 0 && (
                  <span className="ml-auto text-xs opacity-70">
                    {tasks.filter((t) => !t.completed).length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#f5f2ec] p-4">
            <p className="text-sm font-medium">Small steps count.</p>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              Focus on what matters today. Your bigger goals are built one step at a time.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-8 sm:pt-8 lg:px-12">
          <header className="flex items-center justify-between gap-3">
            <div className="md:hidden">
              <p className="text-xl font-semibold tracking-tight">Yama<span className="text-stone-400">.</span></p>
            </div>
            <div className="hidden md:block">
              <p className="text-sm text-stone-500">
                {today ? new Date(`${today}T12:00:00`).toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Your day, at a glance"}
              </p>
            </div>
            <button
              onClick={openTasks}
              className="ml-auto rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
            >
              + New task
            </button>
          </header>

          <section className="mt-9">
            {page === "Home" && (
              <>
                <div>
                  <p className="text-sm font-medium text-stone-500">YOUR PERSONAL WORKSPACE</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Make today count.
                  </h1>
                  <p className="mt-2 text-sm text-stone-500 sm:text-base">
                    A little progress is still progress.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-stone-200 bg-white p-5">
                    <p className="text-sm text-stone-500">Today's tasks</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {hydrated ? todayTasks.length : "—"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">Tasks due today</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-5">
                    <p className="text-sm text-stone-500">Completed today</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {hydrated ? `${completedToday}/${todayTasks.length}` : "—"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">Your daily progress</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-white p-5">
                    <p className="text-sm text-stone-500">Still to do</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {hydrated ? tasks.filter((t) => !t.completed).length : "—"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">Across all dates</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">Today's focus</h2>
                        <p className="mt-1 text-sm text-stone-500">
                          Keep your attention on the next step.
                        </p>
                      </div>
                      <button
                        onClick={() => setPage("Tasks")}
                        className="text-sm font-medium text-stone-600 hover:text-black"
                      >
                        View all →
                      </button>
                    </div>

                    <div className="mt-5">
                      {!hydrated ? (
                        <p className="py-8 text-center text-sm text-stone-500">Loading tasks…</p>
                      ) : (
                        <TaskList items={todayTasks} />
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                    <h2 className="text-lg font-semibold">Daily progress</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      Progress, not perfection.
                    </p>
                    <div className="mt-7 flex items-center gap-5">
                      <div
                        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#44403c ${progress}%, #e7e5e4 ${progress}% 100%)`,
                        }}
                      >
                        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white">
                          <span className="text-xl font-semibold">{progress}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">
                          {todayTasks.length === 0
                            ? "A fresh start"
                            : completedToday === todayTasks.length
                              ? "All done!"
                              : "Keep going"}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-stone-500">
                          {todayTasks.length === 0
                            ? "Add a task to give your day some direction."
                            : `${todayTasks.length - completedToday} task${todayTasks.length - completedToday === 1 ? "" : "s"} left for today.`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={openTasks}
                      className="mt-7 w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium hover:bg-stone-50"
                    >
                      + Plan something
                    </button>
                  </section>
                </div>
              </>
            )}

            {page === "Tasks" && (
              <>
                <p className="text-sm font-medium text-stone-500">GET THINGS DONE</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Tasks</h1>
                <p className="mt-2 text-sm text-stone-500">
                  Capture it, prioritize it, and take the next step.
                </p>

                {showForm && (
                  <form onSubmit={addTask} className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold">Create a task</h2>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="rounded-lg px-2 py-1 text-xl text-stone-400 hover:bg-stone-100"
                        aria-label="Close task form"
                      >
                        ×
                      </button>
                    </div>
                    <label htmlFor="task-title" className="mt-4 block text-sm font-medium">
                      What needs to be done?
                    </label>
                    <input
                      id="task-title"
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Finish the research experiment"
                      className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-100"
                      required
                    />
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="due-date" className="block text-sm font-medium">
                          Due date
                        </label>
                        <input
                          id="due-date"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium">
                          Priority
                        </label>
                        <select
                          id="priority"
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Task["priority"])}
                          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm"
                        >
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="rounded-xl px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
                      >
                        Save task
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap gap-2">
                    {(["All", "Today", "Upcoming", "Completed"] as TaskFilter[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => setFilter(item)}
                        className={`rounded-xl px-3 py-2 text-sm ${
                          filter === item
                            ? "bg-stone-900 font-medium text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    {!hydrated ? (
                      <p className="py-8 text-center text-sm text-stone-500">Loading tasks…</p>
                    ) : (
                      <TaskList items={visibleTasks} />
                    )}
                  </div>
                </div>
              </>
            )}

            {page === "Calendar" && (
              <>
                <p className="text-sm font-medium text-stone-500">YOUR TIME</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Calendar</h1>
                <p className="mt-2 text-sm text-stone-500">
                  Your task deadlines, organized by date.
                </p>
                <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                  <h2 className="font-semibold">
                    {today
                      ? new Date(`${today}T12:00:00`).toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })
                      : "Calendar"}
                  </h2>
                  {!hydrated ? (
                    <p className="mt-5 text-sm text-stone-500">Loading calendar…</p>
                  ) : tasks.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="font-medium">Your calendar is clear.</p>
                      <p className="mt-2 text-sm text-stone-500">
                        Create tasks with due dates to see them here.
                      </p>
                      <button
                        onClick={openTasks}
                        className="mt-4 rounded-xl bg-stone-900 px-4 py-2.5 text-sm text-white"
                      >
                        + Add a task
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-6">
                      {Array.from(new Set(tasks.map((t) => t.dueDate).filter(Boolean)))
                        .sort()
                        .map((date) => (
                          <div key={date}>
                            <div className="mb-2 border-b border-stone-100 pb-2 text-sm font-medium text-stone-500">
                              {date === today ? "Today" : formatDate(date)}
                            </div>
                            <div className="space-y-2">
                              {tasks
                                .filter((t) => t.dueDate === date)
                                .map((task) => (
                                  <div key={task.id} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3">
                                    <button
                                      onClick={() => toggleTask(task.id)}
                                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                        task.completed ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"
                                      }`}
                                      aria-label="Toggle task"
                                    >
                                      {task.completed ? "✓" : ""}
                                    </button>
                                    <span className={`flex-1 text-sm ${task.completed ? "text-stone-400 line-through" : ""}`}>
                                      {task.title}
                                    </span>
                                    <span className="text-xs text-stone-500">{task.priority}</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {page === "Goals" && (
              <>
                <p className="text-sm font-medium text-stone-500">THE BIGGER PICTURE</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Goals</h1>
                <p className="mt-2 text-sm text-stone-500">
                  Turn long-term ambitions into manageable milestones.
                </p>
                <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
                  <div className="text-3xl">◎</div>
                  <h2 className="mt-4 text-lg font-semibold">Make room for what matters</h2>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">
                    Your goals workspace will let you create long-term goals, break them into milestones, and connect them to everyday tasks.
                  </p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wider text-stone-400">
                    Goals management · Next milestone
                  </p>
                </div>
              </>
            )}
          </section>

          <footer className="mt-12 border-t border-stone-200 py-5 text-xs text-stone-400">
            Yama · Build a life with intention.
            <span className="float-right">Your workspace, your pace.</span>
          </footer>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-stone-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => setPage(item.name)}
            className={`flex flex-col items-center gap-1 rounded-xl py-2 text-xs ${
              page === item.name ? "font-semibold text-stone-900" : "text-stone-500"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
