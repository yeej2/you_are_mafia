import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export function openDatabase(filename){
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 const database=new DatabaseSync(filename);
 database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS render_migrations (name TEXT PRIMARY KEY)');
 for(const name of fs.readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
  if(database.prepare('SELECT name FROM render_migrations WHERE name=?').get(name))continue;
  database.exec('BEGIN IMMEDIATE');
  try{database.exec(fs.readFileSync(path.join('drizzle',name),'utf8'));database.prepare('INSERT INTO render_migrations VALUES (?)').run(name);database.exec('COMMIT');}catch(e){database.exec('ROLLBACK');database.close();throw e;}
 }
 function prepared(sql,args=[]){return{bind(...values){return prepared(sql,values);},async first(){return database.prepare(sql).get(...args)??null;},async all(){return{results:database.prepare(sql).all(...args)};},execute(){const result=database.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}};},async run(){return this.execute();}};}
 return{prepare:prepared,async batch(statements){database.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());database.exec('COMMIT');return results;}catch(e){database.exec('ROLLBACK');throw e;}},close(){database.close();}};
}
