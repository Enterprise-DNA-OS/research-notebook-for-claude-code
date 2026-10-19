import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
export async function seed(db){await db.exec(readFileSync(path.join(REPO_ROOT,'supabase/seed.sql'),'utf8'));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const db=await getDb();try{await seed(db);console.log('Fictional research notebook seeded');}finally{await db.close();}}
