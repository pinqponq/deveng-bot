import dotenv from 'dotenv';
import { existsSync, lstatSync } from 'fs';
import { resolve } from 'path';

const cwd = process.cwd();

function warnIfEnvPathIsDir(path: string) {
  if (!existsSync(path)) return;
  if (!lstatSync(path).isDirectory()) return;
  console.error(
    `[FATAL] ${path} bir dizin (docker bind mount: host’ta bu yolda .env dosyası yoksa Linux bazen boş dizin yaratır). ` +
      'stack.yml ile aynı klasöre gerçek .env (dosya) koyun veya volume yolunu düzeltin. cwd=' +
      cwd,
  );
}

const envFile = resolve(cwd, '.env');
const envLocal = resolve(cwd, '.env.local');
warnIfEnvPathIsDir(envFile);
warnIfEnvPathIsDir(envLocal);

dotenv.config({ path: envFile });
dotenv.config({ path: envLocal, override: true });
