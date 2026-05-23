import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const actorType = v.union(v.literal('user'), v.literal('agent'), v.literal('client'))
const phaseStatus = v.union(v.literal('planned'), v.literal('active'), v.literal('complete'), v.literal('paused'))
const taskStatus = v.union(v.literal('todo'), v.literal('wip'), v.literal('need_feedback'), v.literal('done'), v.literal('canceled'))
const fileKind = v.union(
  v.literal('text'),
  v.literal('markdown'),
  v.literal('code'),
  v.literal('image'),
  v.literal('video'),
  v.literal('csv'),
  v.literal('html'),
)

export default defineSchema({
  actors: defineTable({
    name: v.string(),
    type: actorType,
    color: v.string(),
    createdAt: v.number(),
  }),
  phases: defineTable({
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: phaseStatus,
    createdAt: v.number(),
  }),
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    status: taskStatus,
    actorIds: v.array(v.id('actors')),
    createdBy: v.id('actors'),
    dependencyIds: v.array(v.id('tasks')),
    dueDate: v.optional(v.string()),
    phaseId: v.optional(v.id('phases')),
    taskFolder: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_phase', ['phaseId'])
    .index('by_status', ['status']),
  subtasks: defineTable({
    taskId: v.id('tasks'),
    title: v.string(),
    status: taskStatus,
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_task', ['taskId']),
  taskFiles: defineTable({
    taskId: v.id('tasks'),
    name: v.string(),
    kind: fileKind,
    path: v.string(),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_task', ['taskId']),
})
