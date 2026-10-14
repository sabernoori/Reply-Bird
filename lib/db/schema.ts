import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rules = pgTable(
  "rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    matchAny: boolean("match_any").notNull().default(false),
    keywords: text("keywords").array().notNull().default(sql`'{}'`),
    mediaId: text("media_id"),
    dmText: text("dm_text").notNull(),
    dmLink: text("dm_link"),
    dmButtonTitle: text("dm_button_title"),
    publicReplies: text("public_replies").array().notNull().default(sql`'{}'`),
    replyToDms: boolean("reply_to_dms").notNull().default(false),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("rules_priority_idx").on(table.priority)],
);

export const processedComments = pgTable("processed_comments", {
  commentId: text("comment_id").primaryKey(),
  mediaId: text("media_id"),
  fromId: text("from_id"),
  fromUsername: text("from_username"),
  commentText: text("comment_text"),
  ruleId: uuid("rule_id").references(() => rules.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  skipReason: text("skip_reason"),
  dmMessageId: text("dm_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const processedMessages = pgTable("processed_messages", {
  messageId: text("message_id").primaryKey(),
  fromId: text("from_id"),
  messageText: text("message_text"),
  ruleId: uuid("rule_id").references(() => rules.id, { onDelete: "set null" }),
  status: text("status").notNull(),
  skipReason: text("skip_reason"),
  dmMessageId: text("dm_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventLog = pgTable(
  "event_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    level: text("level").notNull().default("info"),
    message: text("message").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("event_log_created_at_idx").on(table.createdAt)],
);

export type Rule = typeof rules.$inferSelect;
export type NewRule = typeof rules.$inferInsert;
export type EventLogRow = typeof eventLog.$inferSelect;
