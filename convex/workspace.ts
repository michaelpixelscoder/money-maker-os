import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const taskStatus = v.union(v.literal('todo'), v.literal('wip'), v.literal('need_feedback'), v.literal('done'), v.literal('canceled'))
const phaseStatus = v.union(v.literal('planned'), v.literal('active'), v.literal('complete'), v.literal('paused'))

export const listWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const [actors, phases, tasks, subtasks, files] = await Promise.all([
      ctx.db.query('actors').collect(),
      ctx.db.query('phases').collect(),
      ctx.db.query('tasks').collect(),
      ctx.db.query('subtasks').collect(),
      ctx.db.query('taskFiles').collect(),
    ])

    return {
      actors,
      phases: phases.sort((a, b) => a.startDate.localeCompare(b.startDate)),
      tasks: tasks.sort((a, b) => b.updatedAt - a.updatedAt),
      subtasks,
      files,
    }
  },
})

export const seedWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const existingActors = await ctx.db.query('actors').take(1)
    if (existingActors.length > 0) return { seeded: false }

    const now = Date.now()
    const michael = await ctx.db.insert('actors', { name: 'Michael', type: 'user', color: '#2563eb', createdAt: now })
    const codex = await ctx.db.insert('actors', { name: 'Codex', type: 'agent', color: '#0f766e', createdAt: now })
    const client = await ctx.db.insert('actors', { name: 'Pilot Client', type: 'client', color: '#b45309', createdAt: now })
    const phase = await ctx.db.insert('phases', {
      name: 'Foundation Sprint',
      startDate: '2026-05-23',
      endDate: '2026-06-06',
      status: 'active',
      createdAt: now,
    })
    const task = await ctx.db.insert('tasks', {
      title: 'Build the Tasks activity',
      description:
        'Create the first operating-system activity for agent-human collaboration. It tracks tasks, phases, actors, dependencies, files, and subtasks.',
      status: 'wip',
      actorIds: [michael, codex],
      createdBy: michael,
      dependencyIds: [],
      dueDate: '2026-05-30',
      phaseId: phase,
      taskFolder: 'tasks/build-tasks-activity',
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('subtasks', {
      taskId: task,
      title: 'Define Convex schema',
      status: 'done',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('subtasks', {
      taskId: task,
      title: 'Create the first planning dashboard',
      status: 'wip',
      sortOrder: 2,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('taskFiles', {
      taskId: task,
      name: 'Operating system brief',
      kind: 'markdown',
      path: 'tasks/build-tasks-activity/brief.md',
      content: '# Money Maker OS\n\nA shared workspace for planning, execution, files, and progress across human and agent actors.',
      createdAt: now,
    })
    await ctx.db.insert('taskFiles', {
      taskId: task,
      name: 'Client kickoff data',
      kind: 'csv',
      path: 'tasks/build-tasks-activity/kickoff.csv',
      content: 'field,value\nactivity,Tasks\nstack,Convex + Vite + React\nhosting,GitHub Pages',
      createdAt: now,
    })

    await ctx.db.insert('tasks', {
      title: 'Prepare client operating reports',
      description: 'Connect existing docs, campaign plans, reports, and scripts into task folders as reusable deliverables.',
      status: 'todo',
      actorIds: [codex, client],
      createdBy: codex,
      dependencyIds: [task],
      dueDate: '2026-06-03',
      phaseId: phase,
      taskFolder: 'tasks/client-operating-reports',
      createdAt: now + 1,
      updatedAt: now + 1,
    })

    return { seeded: true }
  },
})

export const createPhase = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: phaseStatus,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('phases', { ...args, createdAt: Date.now() })
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    dueDate: v.optional(v.string()),
    phaseId: v.optional(v.id('phases')),
    actorIds: v.array(v.id('actors')),
    createdBy: v.id('actors'),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const slug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `task-${now}`
    return await ctx.db.insert('tasks', {
      ...args,
      status: 'todo',
      dependencyIds: [],
      taskFolder: `tasks/${slug}`,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateTaskStatus = mutation({
  args: { taskId: v.id('tasks'), status: taskStatus },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { status: args.status, updatedAt: Date.now() })
  },
})

export const createSubtask = mutation({
  args: { taskId: v.id('tasks'), title: v.string() },
  handler: async (ctx, args) => {
    const siblings = await ctx.db.query('subtasks').withIndex('by_task', (q) => q.eq('taskId', args.taskId)).collect()
    const now = Date.now()
    return await ctx.db.insert('subtasks', {
      taskId: args.taskId,
      title: args.title,
      status: 'todo',
      sortOrder: siblings.length + 1,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateSubtaskStatus = mutation({
  args: { subtaskId: v.id('subtasks'), status: taskStatus },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subtaskId, { status: args.status, updatedAt: Date.now() })
  },
})
