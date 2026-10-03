// Imported only by the Render server bundle. No provider secrets enter the client build.
import {openDatabase} from './render-database.mjs';
export const env={...process.env,DB:openDatabase(process.env.DATABASE_PATH||'.sites-runtime/render/alibi.sqlite')};
