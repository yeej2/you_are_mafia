import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {openDatabase} from '../scripts/render-database.mjs';
const folder=fs.mkdtempSync('.sites-runtime/render-db-test-');
test('Render database preserves rooms across startup and rolls back failed batches',async()=>{
 const filename=folder+'/test.sqlite';let db=openDatabase(filename);
 await db.prepare('INSERT INTO rooms(code,state,revision,updated) VALUES (?,?,0,?)').bind('ABC123','{}',1).run();
 await assert.rejects(db.batch([db.prepare('UPDATE rooms SET updated=2 WHERE code=?').bind('ABC123'),db.prepare('INSERT INTO rooms(code,state,revision,updated) VALUES (?,?,0,?)').bind('ABC123','{}',3)]));
 assert.equal((await db.prepare('SELECT updated FROM rooms WHERE code=?').bind('ABC123').first()).updated,1);
 db.close();db=openDatabase(filename);assert.equal((await db.prepare('SELECT code FROM rooms').all()).results[0].code,'ABC123');db.close();
});
