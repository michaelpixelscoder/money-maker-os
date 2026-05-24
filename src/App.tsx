import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileCode2,
  FileImage,
  FileText,
  Film,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Link2,
  ListChecks,
  LockKeyhole,
  LogOut,
  MessageSquareWarning,
  Milestone,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Table2,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { Authenticated, AuthLoading, Unauthenticated, useAction, useMutation, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import { cn } from '@/lib/utils'

const taskStatuses = ['todo', 'wip', 'need_feedback', 'done', 'canceled'] as const

const statusMeta = {
  todo: { label: 'Todo', icon: CircleDot, className: 'bg-slate-100 text-slate-700 border-slate-200' },
  wip: { label: 'WIP', icon: Clock3, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  need_feedback: { label: 'Needs feedback', icon: MessageSquareWarning, className: 'bg-amber-100 text-amber-800 border-amber-200' },
  done: { label: 'Done', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  canceled: { label: 'Canceled', icon: XCircle, className: 'bg-stone-200 text-stone-700 border-stone-300' },
}

type TaskStatus = (typeof taskStatuses)[number]
type UserRole = 'admin' | 'user'
type Activity = 'overview' | 'tasks' | 'phase' | 'admin'
type ActorRecord = { _id: Id<'actors'>; name: string }
type PhaseRecord = {
  _id: Id<'phases'>
  name: string
  startDate: string
  endDate: string
  status: 'planned' | 'active' | 'complete' | 'paused'
}
type TaskRecord = {
  _id: Id<'tasks'>
  title: string
  description: string
  status: TaskStatus
  actorIds: Id<'actors'>[]
  dependencyIds: Id<'tasks'>[]
  dueDate?: string
  phaseId?: Id<'phases'>
  taskFolder: string
  updatedAt: number
}

function optionalFormString(value: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || undefined
}

function App() {
  return (
    <>
      <AuthLoading>
        <LoadingShell />
      </AuthLoading>
      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>
      <Authenticated>
        <TasksActivity />
      </Authenticated>
    </>
  )
}

function TasksActivity() {
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.admin.currentUser)
  const workspace = useQuery(api.workspace.listWorkspace)
  const seedWorkspace = useMutation(api.workspace.seedWorkspace)
  const createTask = useMutation(api.workspace.createTask)
  const createPhase = useMutation(api.workspace.createPhase)
  const updateTaskStatus = useMutation(api.workspace.updateTaskStatus)
  const createSubtask = useMutation(api.workspace.createSubtask)
  const updateSubtaskStatus = useMutation(api.workspace.updateSubtaskStatus)
  const [selectedTaskId, setSelectedTaskId] = useState<Id<'tasks'> | null>(null)
  const [selectedPhaseId, setSelectedPhaseId] = useState<Id<'phases'> | null>(null)
  const [newSubtask, setNewSubtask] = useState('')
  const [activity, setActivity] = useState<Activity>('overview')

  const selectedTask = useMemo(() => {
    if (!workspace?.tasks.length) return null
    return workspace.tasks.find((task) => task._id === selectedTaskId) ?? workspace.tasks[0]
  }, [selectedTaskId, workspace?.tasks])

  const taskFiles = workspace?.files.filter((file) => file.taskId === selectedTask?._id) ?? []
  const subtasks = workspace?.subtasks
    .filter((subtask) => subtask.taskId === selectedTask?._id)
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? []
  const phase = workspace?.phases.find((item) => item._id === selectedTask?.phaseId)
  const selectedPhase = workspace?.phases.find((item) => item._id === selectedPhaseId) ?? null

  const metrics = useMemo(() => {
    const tasks = workspace?.tasks ?? []
    return {
      active: tasks.filter((task) => task.status === 'wip' || task.status === 'need_feedback').length,
      done: tasks.filter((task) => task.status === 'done').length,
      phases: workspace?.phases.length ?? 0,
      actors: workspace?.actors.length ?? 0,
    }
  }, [workspace])

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace?.actors.length) return
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    if (!title || !description) return
    const actorIds = form.getAll('actorIds') as Id<'actors'>[]
    const taskId = await createTask({
      title,
      description,
      dueDate: String(form.get('dueDate') || undefined) || undefined,
      phaseId: String(form.get('phaseId') || undefined) as Id<'phases'> | undefined,
      actorIds: actorIds.length ? actorIds : [workspace.actors[0]._id],
      createdBy: workspace.actors[0]._id,
    })
    setSelectedTaskId(taskId)
    event.currentTarget.reset()
  }

  async function handlePhaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    if (!name) return
    await createPhase({
      name,
      startDate: String(form.get('startDate')),
      endDate: String(form.get('endDate')),
      status: 'planned',
    })
    event.currentTarget.reset()
  }

  async function handleSubtaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedTask || !newSubtask.trim()) return
    await createSubtask({ taskId: selectedTask._id, title: newSubtask.trim() })
    setNewSubtask('')
  }

  function openPhase(phaseId: Id<'phases'>) {
    setSelectedPhaseId(phaseId)
    setActivity('phase')
  }

  function openTask(taskId: Id<'tasks'>) {
    setSelectedTaskId(taskId)
    setActivity('tasks')
  }

  if (!workspace) {
    return <LoadingShell />
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-20 border-r bg-card lg:flex lg:flex-col lg:items-center lg:py-5">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BriefcaseBusiness className="size-5" />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-3">
          <IconButton active={activity === 'overview'} label="Overview" onClick={() => setActivity('overview')}>
            <Milestone className="size-5" />
          </IconButton>
          <IconButton active={activity === 'tasks'} label="Tasks" onClick={() => setActivity('tasks')}>
            <ListChecks className="size-5" />
          </IconButton>
          <IconButton label="Ads">
            <LayoutDashboard className="size-5" />
          </IconButton>
          <IconButton label="CRM">
            <UsersRound className="size-5" />
          </IconButton>
          {currentUser?.role === 'admin' && (
            <IconButton active={activity === 'admin'} label="Admin" onClick={() => setActivity('admin')}>
              <ShieldCheck className="size-5" />
            </IconButton>
          )}
        </nav>
      </aside>

      <main className="lg:pl-20">
        <header className="border-b bg-card">
          <div className="flex min-h-20 flex-col justify-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Money Maker OS</p>
                <h1 className="text-2xl font-semibold tracking-normal">
                  {activity === 'admin'
                    ? 'Admin'
                    : activity === 'overview'
                      ? 'Overview'
                      : activity === 'phase'
                        ? selectedPhase?.name ?? 'Phase'
                        : 'Tasks Activity'}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={() => void seedWorkspace()}
                >
                  <Plus className="size-4" />
                  Seed workspace
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
                  onClick={() => void signOut()}
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {activity === 'admin' && currentUser?.role === 'admin' ? (
          <AdminPage />
        ) : activity === 'overview' ? (
          <OverviewPage
            actors={workspace.actors}
            phases={workspace.phases}
            tasks={workspace.tasks}
            onOpenPhase={openPhase}
            onOpenTask={openTask}
          />
        ) : activity === 'phase' && selectedPhase ? (
          <PhasePage
            actors={workspace.actors}
            phase={selectedPhase}
            tasks={workspace.tasks.filter((task) => task.phaseId === selectedPhase._id)}
            onBack={() => setActivity('overview')}
            onOpenTask={openTask}
          />
        ) : (
          <>
            <section className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <Metric label="Active tasks" value={metrics.active} />
          <Metric label="Completed" value={metrics.done} />
          <Metric label="Phases" value={metrics.phases} />
          <Metric label="Actors" value={metrics.actors} />
            </section>

            <section className="grid gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
          <div className="space-y-5">
            <Panel title="Plan a task" icon={<Plus className="size-4" />}>
              <form className="space-y-3" onSubmit={(event) => void handleTaskSubmit(event)}>
                <Input name="title" placeholder="Task title" required />
                <textarea
                  className="min-h-28 w-full rounded-md border bg-card px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
                  name="description"
                  placeholder="Markdown description"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="dueDate" type="date" />
                  <select className="rounded-md border bg-card px-3 py-2 text-sm" name="phaseId" defaultValue="">
                    <option value="">No phase</option>
                    {workspace.phases.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workspace.actors.map((actor) => (
                    <label key={actor._id} className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                      <input name="actorIds" type="checkbox" value={actor._id} />
                      {actor.name}
                    </label>
                  ))}
                </div>
                <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Plus className="size-4" />
                  Create task
                </button>
              </form>
            </Panel>

            <Panel title="Create phase" icon={<CalendarDays className="size-4" />}>
              <form className="space-y-3" onSubmit={(event) => void handlePhaseSubmit(event)}>
                <Input name="name" placeholder="Phase name" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input name="startDate" type="date" required />
                  <Input name="endDate" type="date" required />
                </div>
                <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                  <Plus className="size-4" />
                  Add phase
                </button>
              </form>
            </Panel>

            <Panel title="Task board" icon={<FolderKanban className="size-4" />}>
              <div className="space-y-2">
                {workspace.tasks.map((task) => (
                  <button
                    key={task._id}
                    className={cn(
                      'w-full rounded-md border bg-card p-3 text-left transition hover:bg-muted',
                      selectedTask?._id === task._id && 'border-primary ring-2 ring-primary/20',
                    )}
                    onClick={() => setSelectedTaskId(task._id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      <StatusBadge status={task.status} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{task.taskFolder}</p>
                  </button>
                ))}
                {!workspace.tasks.length && <EmptyState text="Seed the workspace or create the first task." />}
              </div>
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            {selectedTask ? (
              <>
                <section className="rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedTask.status} />
                        {phase && (
                          <button
                            className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                            onClick={() => openPhase(phase._id)}
                          >
                            {phase.name}
                          </button>
                        )}
                      </div>
                      <h2 className="mt-3 text-2xl font-semibold tracking-normal">{selectedTask.title}</h2>
                      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <FolderKanban className="size-4" />
                        {selectedTask.taskFolder}
                      </p>
                    </div>
                    <select
                      className="h-10 rounded-md border bg-card px-3 text-sm"
                      value={selectedTask.status}
                      onChange={(event) =>
                        void updateTaskStatus({ taskId: selectedTask._id, status: event.target.value as TaskStatus })
                      }
                    >
                      {taskStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusMeta[status].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <Fact icon={<CalendarDays className="size-4" />} label="Due date" value={selectedTask.dueDate ?? 'Not set'} />
                    <Fact icon={<UsersRound className="size-4" />} label="Assignations" value={actorNames(workspace.actors, selectedTask.actorIds)} />
                    <Fact icon={<Link2 className="size-4" />} label="Dependencies" value={`${selectedTask.dependencyIds.length} linked`} />
                  </div>

                  <div className="prose prose-sm mt-6 max-w-none text-foreground">
                    <ReactMarkdown>{selectedTask.description}</ReactMarkdown>
                  </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <Panel title="Subtasks" icon={<ListChecks className="size-4" />}>
                    <form className="mb-3 flex gap-2" onSubmit={(event) => void handleSubtaskSubmit(event)}>
                      <Input value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="Add a subtask" />
                      <button className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Plus className="size-4" />
                      </button>
                    </form>
                    <div className="space-y-2">
                      {subtasks.map((subtask) => (
                        <div key={subtask._id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                          <p className="text-sm">{subtask.title}</p>
                          <select
                            className="h-8 rounded-md border bg-card px-2 text-xs"
                            value={subtask.status}
                            onChange={(event) =>
                              void updateSubtaskStatus({ subtaskId: subtask._id, status: event.target.value as TaskStatus })
                            }
                          >
                            {taskStatuses.map((status) => (
                              <option key={status} value={status}>
                                {statusMeta[status].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      {!subtasks.length && <EmptyState text="No subtasks yet." />}
                    </div>
                  </Panel>

                  <Panel title="Files" icon={<FileText className="size-4" />}>
                    <div className="space-y-3">
                      {taskFiles.map((file) => (
                        <FilePreview key={file._id} file={file} />
                      ))}
                      {!taskFiles.length && <EmptyState text="No task files linked yet." />}
                    </div>
                  </Panel>
                </section>

                <Panel title="Phase timeline" icon={<CalendarDays className="size-4" />}>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {workspace.phases.map((item) => (
                      <button key={item._id} className="rounded-md border p-3 text-left transition hover:border-primary hover:bg-muted/60" onClick={() => openPhase(item._id)}>
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.startDate} to {item.endDate}
                        </p>
                        <span className="mt-3 inline-flex rounded-md bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                          {item.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </Panel>
              </>
            ) : (
              <section className="flex min-h-[520px] items-center justify-center rounded-lg border bg-card p-8">
                <EmptyState text="No task selected. Seed the workspace to start with a working example." />
              </section>
            )}
          </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function OverviewPage({
  actors,
  phases,
  tasks,
  onOpenPhase,
  onOpenTask,
}: {
  actors: ActorRecord[]
  phases: PhaseRecord[]
  tasks: TaskRecord[]
  onOpenPhase: (phaseId: Id<'phases'>) => void
  onOpenTask: (taskId: Id<'tasks'>) => void
}) {
  const unassignedTasks = tasks.filter((task) => !task.phaseId)

  return (
    <section className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Phases" value={phases.length} />
        <Metric label="Tasks" value={tasks.length} />
        <Metric label="Active" value={tasks.filter((task) => task.status === 'wip' || task.status === 'need_feedback').length} />
        <Metric label="Done" value={tasks.filter((task) => task.status === 'done').length} />
      </div>

      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseTasks = tasks.filter((task) => task.phaseId === phase._id)
          const progress = phaseProgress(phaseTasks)

          return (
            <section key={phase._id} className="rounded-lg border bg-card p-4 shadow-sm">
              <button className="w-full text-left" onClick={() => onOpenPhase(phase._id)}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-normal">{phase.name}</h2>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">{phase.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{phase.startDate} to {phase.endDate}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{progress.done}/{progress.total} done</p>
                    <p className="text-muted-foreground">{progress.percent}% complete</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
                </div>
              </button>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {phaseTasks.map((task) => (
                  <TaskSummaryCard key={task._id} actors={actors} task={task} onOpenTask={onOpenTask} />
                ))}
                {phaseTasks.length === 0 && <EmptyState text="No tasks in this phase yet." />}
              </div>
            </section>
          )
        })}

        {unassignedTasks.length > 0 && (
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold tracking-normal">No phase</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {unassignedTasks.map((task) => (
                <TaskSummaryCard key={task._id} actors={actors} task={task} onOpenTask={onOpenTask} />
              ))}
            </div>
          </section>
        )}

        {phases.length === 0 && <EmptyState text="No phases yet. Create a phase from the Tasks activity." />}
      </div>
    </section>
  )
}

function PhasePage({
  actors,
  phase,
  tasks,
  onBack,
  onOpenTask,
}: {
  actors: ActorRecord[]
  phase: PhaseRecord
  tasks: TaskRecord[]
  onBack: () => void
  onOpenTask: (taskId: Id<'tasks'>) => void
}) {
  const progress = phaseProgress(tasks)
  const activeTasks = tasks.filter((task) => task.status === 'wip' || task.status === 'need_feedback')

  return (
    <section className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <button className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Overview
      </button>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-normal">{phase.name}</h2>
              <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">{phase.status}</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="size-4" />
              {phase.startDate} to {phase.endDate}
            </p>
          </div>
          <div className="min-w-44 text-sm">
            <p className="font-medium">{progress.done}/{progress.total} tasks done</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Tasks" value={tasks.length} />
        <Metric label="Active" value={activeTasks.length} />
        <Metric label="Feedback" value={tasks.filter((task) => task.status === 'need_feedback').length} />
        <Metric label="Canceled" value={tasks.filter((task) => task.status === 'canceled').length} />
      </section>

      <Panel title="Phase tasks" icon={<ListChecks className="size-4" />}>
        <div className="grid gap-3 lg:grid-cols-2">
          {tasks.map((task) => (
            <TaskSummaryCard key={task._id} actors={actors} task={task} onOpenTask={onOpenTask} />
          ))}
          {tasks.length === 0 && <EmptyState text="No tasks are linked to this phase." />}
        </div>
      </Panel>
    </section>
  )
}

function TaskSummaryCard({
  actors,
  task,
  onOpenTask,
}: {
  actors: ActorRecord[]
  task: TaskRecord
  onOpenTask: (taskId: Id<'tasks'>) => void
}) {
  return (
    <button className="rounded-md border bg-background p-3 text-left transition hover:border-primary hover:bg-muted/60" onClick={() => onOpenTask(task._id)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{task.title}</p>
        <StatusBadge status={task.status} />
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-1">{task.dueDate ?? 'No due date'}</span>
        <span className="rounded-md bg-muted px-2 py-1">{actorNames(actors, task.actorIds)}</span>
      </div>
    </button>
  )
}

function phaseProgress(tasks: TaskRecord[]) {
  const total = tasks.length
  const done = tasks.filter((task) => task.status === 'done').length
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

function AdminPage() {
  const users = useQuery(api.admin.listUsers)
  const createUser = useAction(api.admin.createUser)
  const updateUser = useMutation(api.admin.updateUser)
  const removeUser = useMutation(api.admin.removeUser)
  const changeUserPassword = useAction(api.admin.changeUserPassword)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function runAdminTask(task: () => Promise<unknown>, success: string) {
    setError('')
    setMessage('')
    try {
      await task()
      setMessage(success)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin action failed')
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await runAdminTask(
      async () => {
        await createUser({
          email: String(form.get('email')),
          password: String(form.get('password')),
          name: optionalFormString(form.get('name')),
          role: String(form.get('role')) as UserRole,
        })
        event.currentTarget.reset()
      },
      'User created.',
    )
  }

  return (
    <section className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel title="Add user" icon={<UserPlus className="size-4" />}>
          <form className="space-y-3" onSubmit={(event) => void handleCreateUser(event)}>
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="name" placeholder="Display name" />
            <Input name="password" type="password" placeholder="Temporary password" required />
            <select className="h-10 w-full rounded-md border bg-card px-3 text-sm" name="role" defaultValue="user">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <UserPlus className="size-4" />
              Create user
            </button>
          </form>
        </Panel>

        <Panel title="Users" icon={<UsersRound className="size-4" />}>
          <div className="mb-4 space-y-2">
            {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </div>
          <div className="space-y-3">
            {users?.map((user) => (
              <form
                key={user._id}
                className="grid gap-3 rounded-md border p-3 xl:grid-cols-[minmax(180px,1.3fr)_minmax(140px,1fr)_110px_120px_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = new FormData(event.currentTarget)
                  void runAdminTask(
                    async () =>
                      updateUser({
                        userId: user._id,
                        email: String(form.get('email')),
                        name: optionalFormString(form.get('name')),
                        role: String(form.get('role')) as UserRole,
                        disabled: form.get('disabled') === 'on',
                      }),
                    'User updated.',
                  )
                }}
              >
                <Input name="email" type="email" defaultValue={user.email} required />
                <Input name="name" defaultValue={user.name} placeholder="Name" />
                <select className="h-10 rounded-md border bg-card px-3 text-sm" name="role" defaultValue={user.role ?? 'user'}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
                  <input name="disabled" type="checkbox" defaultChecked={user.disabled} />
                  Disabled
                </label>
                <div className="flex flex-wrap gap-2">
                  <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                    Save
                  </button>
                  <button
                    className="inline-flex size-10 items-center justify-center rounded-md border bg-card hover:bg-muted"
                    title="Change password"
                    type="button"
                    onClick={() => {
                      const password = window.prompt(`New password for ${user.email}`)
                      if (!password) return
                      void runAdminTask(
                        async () => changeUserPassword({ userId: user._id, password }),
                        'Password changed.',
                      )
                    }}
                  >
                    <KeyRound className="size-4" />
                  </button>
                  <button
                    className="inline-flex size-10 items-center justify-center rounded-md border border-destructive/30 bg-card text-destructive hover:bg-destructive/10"
                    title="Remove user"
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Remove ${user.email}?`)) return
                      void runAdminTask(async () => removeUser({ userId: user._id }), 'User removed.')
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </form>
            ))}
            {!users && <EmptyState text="Loading users..." />}
            {users?.length === 0 && <EmptyState text="No users yet." />}
          </div>
        </Panel>
      </div>
    </section>
  )
}

function IconButton({ active, label, onClick, children }: { active?: boolean; label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
        active && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
      )}
    >
      {children}
    </button>
  )
}

function SignInScreen() {
  const { signIn } = useAuthActions()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    formData.set('flow', 'signIn')
    try {
      await signIn('password', formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not authenticate.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
      <section className="hidden border-r bg-card p-8 lg:flex lg:flex-col lg:justify-between">
        <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BriefcaseBusiness className="size-6" />
        </div>
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Private operating workspace
          </div>
          <h1 className="text-4xl font-semibold tracking-normal">Money Maker OS</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Tasks, phases, files, and execution plans stay behind authenticated sessions while the app remains publicly hosted.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Convex Auth protects the data layer and session state.</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LockKeyhole className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Money Maker OS</p>
              <h2 className="text-xl font-semibold tracking-normal">Sign in</h2>
            </div>
          </div>

          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <Input name="email" placeholder="Email" type="email" autoComplete="email" required />
            <Input
              name="password"
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Working...' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

function LoadingShell() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading workspace...</div>
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="h-10 w-full rounded-md border bg-card px-3 text-sm outline-none ring-ring focus:ring-2" {...props} />
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium', meta.className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-medium">{value}</p>
    </div>
  )
}

function FilePreview({ file }: { file: { name: string; kind: string; path: string; content?: string; url?: string } }) {
  const icon = file.kind === 'image' ? <FileImage className="size-4" /> : file.kind === 'video' ? <Film className="size-4" /> : file.kind === 'csv' ? <Table2 className="size-4" /> : file.kind === 'code' ? <FileCode2 className="size-4" /> : <FileText className="size-4" />
  return (
    <article className="rounded-md border">
      <div className="flex items-center gap-2 border-b p-3">
        {icon}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="truncate text-xs text-muted-foreground">{file.path}</p>
        </div>
      </div>
      {file.kind === 'markdown' && file.content ? (
        <div className="prose prose-sm max-w-none p-3">
          <ReactMarkdown>{file.content}</ReactMarkdown>
        </div>
      ) : file.kind === 'csv' && file.content ? (
        <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-3 text-xs">{file.content}</pre>
      ) : file.kind === 'image' && file.url ? (
        <img className="aspect-video w-full object-cover" src={file.url} alt={file.name} />
      ) : file.kind === 'video' && file.url ? (
        <video className="aspect-video w-full" src={file.url} controls />
      ) : (
        <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-3 text-xs">{file.content ?? 'External or disk-backed file.'}</pre>
      )}
    </article>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{text}</p>
}

function actorNames(actors: { _id: Id<'actors'>; name: string }[], actorIds: Id<'actors'>[]) {
  return actorIds.map((id) => actors.find((actor) => actor._id === id)?.name).filter(Boolean).join(', ') || 'Unassigned'
}

export default App
