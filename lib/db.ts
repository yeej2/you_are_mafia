import {env} from 'cloudflare:workers';
export function db(){const binding=(env as unknown as {DB:D1Database}).DB;if(!binding)throw Error('Room service is unavailable. Please try again later.');return binding;}
