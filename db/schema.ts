import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';

export const rooms=sqliteTable('rooms',{code:text('code').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(0),updated:integer('updated').notNull(),lockedUntil:integer('locked_until').notNull().default(0),lockOwner:text('lock_owner')});

export const presence=sqliteTable('presence',{id:text('id').primaryKey(),room:text('room').notNull(),seen:integer('seen').notNull()},t=>[index('presence_room_idx').on(t.room)]);



export const simulationMedia=sqliteTable('simulation_media',{id:text('id').primaryKey(),room:text('room').notNull(),kind:text('kind').notNull(),status:text('status').notNull(),attempts:integer('attempts').notNull().default(1),content:text('content'),mime:text('mime'),updated:integer('updated').notNull()},t=>[index('simulation_media_room_kind').on(t.room,t.kind)]);

