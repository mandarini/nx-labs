import { mkdirSync, writeFileSync } from 'fs-extra';
import { join } from 'path';

import {
  ensureNxProject,
  runCommand,
  tmpProjPath,
  uniq,
} from '@nx/plugin/testing';

describe('nx-ignore e2e', () => {
  let proj: string;
  let projRoot: string;

  beforeEach(() => {
    proj = uniq('proj');
    projRoot = join(tmpProjPath(), proj);
    ensureNxProject('nx-ignore', 'dist/packages/nx-ignore');

    // Add a test project we can make changes to
    mkdirSync(projRoot, { recursive: true });
    writeFileSync(join(projRoot, 'main.ts'), `console.log('hello');\n`);
    writeFileSync(
      join(tmpProjPath(), 'project.json'),
      JSON.stringify(
        {
          name: proj,
          root: projRoot,
        },
        null,
        2
      )
    );
    console.log('Hello I am running git init');
    const result1 = runCommand(`git init`, {});
    console.log('RESULT 1', result1);
    console.log('Hello I am running git add');
    const result2 = runCommand(`git add .`, {});
    console.log('RESULT 2', result2);
    runCommand(`git config user.email "you@example.com"`, {});
    runCommand(`git config user.name "Your Name"`, {});
    console.log('Hello I am running git commit');
    const result3 = runCommand(`git commit -m 'init'`, {});
    console.log('RESULT 3', result3);
  });

  it('should deploy if the latest commit touches the project', async () => {
    writeFileSync(join(projRoot, 'main.ts'), `console.log('bye');\n`);
    const result4 = runCommand('git commit -am "update main"', {});
    console.log('RESULT 4', result4);

    let result = runCommand(`npx nx-ignore ${proj}`, {});
    console.log('RESULT 5', result);
    expect(result).toMatch(/Build can proceed/);

    runCommand('git commit -m "nothing" --allow-empty', {});
    result = runCommand(`npx nx-ignore ${proj}`, {});
    expect(result).toMatch(/Build cancelled/);
  }, 120_000);

  it('should skip deploy based on commit message', async () => {
    [
      '[ci skip] test',
      '[skip ci] test',
      '[no ci] test',
      '[nx skip] test',
      `[nx skip ${proj}] test`,
    ].forEach((msg) => {
      writeFileSync(join(projRoot, 'main.ts'), `console.log('bye');\n`);
      runCommand(`git commit -am "${msg}"`, {});

      const result = runCommand(`npx nx-ignore ${proj}`, {});
      expect(result).toMatch(/Skip build/);
    });
  }, 120_000);

  it('should force deploy based on commit message', async () => {
    ['[nx deploy] test', `[nx deploy ${proj}] test`].forEach((msg) => {
      runCommand(`git commit -m "${msg}" --allow-empty`, {});

      const result = runCommand(`npx nx-ignore ${proj}`, {});
      expect(result).toMatch(/Forced build/);
    });
  }, 120_000);
});
