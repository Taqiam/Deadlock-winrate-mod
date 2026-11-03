import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseLayoutDump, encodeLayoutAST, readResource, resource, vpk } from './formats.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [cli, gameVpk] = process.argv.slice(2);
if (!cli || !gameVpk) throw Error('Usage: node build.mjs path/to/Source2Viewer-CLI.exe path/to/citadel/pak01_dir.vpk');
const output = here;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'deadlock-winrate-'));
function run(args) {
    const result = spawnSync(cli, args, {encoding:'utf8'});
    if (result.status !== 0 || result.error) throw Error(result.stderr || String(result.error));
    return result.stdout;
}
const originalFile = path.join(scratch, 'original_profile.vxml_c');
run(['-i', gameVpk, '-f', 'panorama/layout/citadel_db_page_profile.vxml_c', '-o', originalFile]);
const ast = parseLayoutDump(run(['-i', originalFile, '-b', 'LaCo']));
const root = ast.m_AST.m_pRoot;
// This one include is the ONLY change to Valve's profile layout.
root.vecChildren.splice(1, 0, {
    eType:'SCRIPTS', sourceLineColumn:[1,1], child:{
        eType:'INCLUDE', sourceLineColumn:[1,1], child:{
            eType:'REFERENCE_COMPILED', name:'panorama/scripts/profile_win_rate.vjs_c'
        }
    }
});
const original = fs.readFileSync(originalFile);
const blocks = readResource(original);
blocks.find(block => block.type === 'LaCo').data = encodeLayoutAST(ast);
const layout = resource(original.readUInt16LE(6), blocks);
// Panorama JS version 4 stores UTF-8 JavaScript directly in DATA.
const script = resource(4, [{type:'DATA',data:fs.readFileSync(path.join(here,'profile_win_rate.js'))}]);
const files = [
    ['panorama/layout/citadel_db_page_profile.vxml_c',layout],
    ['panorama/scripts/profile_win_rate.vjs_c',script]
];
fs.writeFileSync(path.join(scratch,'profile.vxml_c'),layout);
fs.writeFileSync(path.join(scratch,'profile.vjs_c'),script);
run(['-i',path.join(scratch,'profile.vxml_c'),'-d','-o',path.join(here,'profile.xml')]);
if (!fs.readFileSync(path.join(here,'profile.xml'),'utf8').includes('profile_win_rate.vjs_c')) {
    throw Error('Layout decompilation did not preserve the script include');
}
fs.writeFileSync(path.join(output,'win-rate_dir.vpk'),vpk(files));
console.log('Built win-rate_dir.vpk with exactly two resources. No QOL files used.');
