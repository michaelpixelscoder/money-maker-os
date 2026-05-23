import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import {
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
  LayoutDashboard,
  Link2,
  ListChecks,
  LockKeyhole,
  LogOut,
  MessageSquareWarning,
  Plus,
  ShieldCheck,
  Table2,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
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
  const workspace = useQuery(api.workspace.listWorkspace)
  const seedWorkspace = useMutation(api.workspace.seedWorkspace)
  const createTask = useMutation(api.workspace.createTask)
  const createPhase = useMutation(api.workspace.createPhase)
  const updateTaskStatus = useMutation(api.workspace.updateTaskStatus)
  const createSubtask = useMutation(api.workspace.createSubtask)
  const updateSubtaskStatus = useMutation(api.workspace.updateSubtaskStatus)
  const [selectedTaskId, setSelectedTaskId] = useState<Id<'tasks'> | null>(null)
  const [newSubtask, setNewSubtask] = useState('')

  const selectedTask = useMemo(() => {
    if (!workspace?.tasks.length) return null
    return workspace.tasks.find((task) => task._id === selectedTaskId) ?? workspace.tasks[0]
  }, [selectedTaskId, workspace?.tasks])

  const taskFiles = workspace?.files.filter((file) => file.taskId === selectedTask?._id) ?? []
  const subtasks = workspace?.subtasks
    .filter((subtask) => subtask.taskId === selectedTask?._id)
    .sort((a, b) => a.sortOrder - b.sortOrder) ?? []
  const phase = workspace?.phases.find((item) => item._id === selectedTask?.phaseId)

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
          <IconButton active label="Tasks">
            <ListChecks className="size-5" />
          </IconButton>
          <IconButton label="Ads">
            <LayoutDashboard className="size-5" />
          </IconButton>
          <IconButton label="CRM">
            <UsersRound className="size-5" />
          </IconButton>
        </nav>
      </aside>

      <main className="lg:pl-20">
        <header className="border-b bg-card">
          <div className="flex min-h-20 flex-col justify-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Money Maker OS</p>
                <h1 className="text-2xl font-semibold tracking-normal">Tasks Activity</h1>
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
                        {phase && <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{phase.name}</span>}
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
                      <div key={item._id} className="rounded-md border p-3">
                        <p className="font-medium">{item.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.startDate} to {item.endDate}
                        </p>
                        <span className="mt-3 inline-flex rounded-md bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">
                          {item.status}
                        </span>
                      </div>
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
      </main>
    </div>
  )
}

function IconButton({ active, label, children }: { active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
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
  const [flow, setFlow] = useState<'signIn' | 'signUp'>('signIn')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    formData.set('flow', flow)
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
              <h2 className="text-xl font-semibold tracking-normal">{flow === 'signIn' ? 'Sign in' : 'Create account'}</h2>
            </div>
          </div>

          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <Input name="email" placeholder="Email" type="email" autoComplete="email" required />
            <Input
              name="password"
              placeholder="Password"
              type="password"
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
              required
            />
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <button
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Working...' : flow === 'signIn' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
            type="button"
            onClick={() => {
              setError('')
              setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
            }}
          >
            {flow === 'signIn' ? 'Create an account instead' : 'Sign in instead'}
          </button>
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
