import fs from 'fs-extra';
import path from 'path';
import extract from 'extract-zip';
import shell from 'shelljs';
import {Login} from '../util/login.js';
import {log} from '../util/log.js';
import {Command} from 'commander';
import {createInput} from '../util/prompts.js';

export default (program: Command) => {
  program
    .command('download')
    .description('download a Custom App design')
    .option('-i, --design-id <id>', 'design id')
    .option('-d, --design-version <design-version>', 'design version')
    .action(async args => {
      try {
        const client = await new Login().getClient();
        let designId = args.designId;
        let version = args.designVersion;

        if (!designId) {
          designId = await createInput('design id');
        }
        if (!version) {
          version = await createInput('version', 'latest');
        }

        const res = await client.assets.download(designId, version);

        if (res.ok) {
          const regexp = /filename="(.*)"/;
          const disposition = res.headers.get('content-disposition') ?? '';
          const name = disposition.match(regexp)?.[1] || 'domoapp';
          const zipPath = './' + name + '.zip';
          const arrayBuffer = await res.arrayBuffer();
          fs.writeFileSync(zipPath, Buffer.from(arrayBuffer), {
            mode: 0o666,
          });

          const source = path.resolve(zipPath);
          const target = path.resolve('./' + name);

          try {
            await extract(source, {
              dir: target,
              // extract-zip@2.0.1 (latest published; no release since 2020)
              // writes a symlink entry's target as-is with no check that it
              // stays inside `dir` (GHSA-jmr9-qjv8-65gv, zip-slip via
              // symlink). Design assets are source files and have no
              // legitimate reason to contain a symlink, so reject any.
              onEntry: entry => {
                const mode = (entry.externalFileAttributes >> 16) & 0xffff;
                const IFMT = 0xf000;
                const IFLNK = 0xa000;
                if ((mode & IFMT) === IFLNK) {
                  throw new Error(
                    `refusing to extract symlink entry "${entry.fileName}" (GHSA-jmr9-qjv8-65gv)`,
                  );
                }
              },
            });
          } catch {
            (shell as any).chmod('-R', 'u+w', target);
            fs.remove(source);
            log.fail(
              'Extraction of design from its compressed zip file failed, removing downloaded zip.',
            );
          }
        } else {
          log.fail(
            'Design not found. Make sure you have the correct design id.',
          );
        }
      } catch {
        log.clientRequestFailed('Unable to download design ' + args.designId);
      }
    });
};
