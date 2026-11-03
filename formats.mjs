// Small, dependency-free writers for the formats this mod needs.
// KV3 layout based on ValveResourceFormat's BinaryKV3.Serialization.cs:
// https://github.com/ValveResourceFormat/ValveResourceFormat
export function u32(value) {
    const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0); return b;
}
export function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

// Parse the simple KV3 text used by Panorama layout ASTs, not arbitrary KV3.
export function parseLayoutDump(text) {
    text = text.slice(text.indexOf('-->') + 3);
    const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}\[\]=,]|-?\d+|[A-Za-z_][A-Za-z_0-9]*/g);
    let cursor = 0;
    function read() {
        const token = tokens[cursor++];
        if (token === '{') {
            const object = {};
            while (tokens[cursor] !== '}') {
                const key = tokens[cursor++];
                if (tokens[cursor++] !== '=') throw Error('Expected =');
                object[key] = read();
            }
            cursor++; return object;
        }
        if (token === '[') {
            const array = [];
            while (tokens[cursor] !== ']') {
                if (tokens[cursor] === ',') cursor++; else array.push(read());
            }
            cursor++; return array;
        }
        if (token.startsWith('"')) return JSON.parse(token);
        if (/^-?\d+$/.test(token)) return Number(token);
        throw Error('Unsupported layout token: ' + token);
    }
    return read();
}

// KV3 v4, uncompressed. This AST needs only objects, arrays, strings and int32s.
export function encodeLayoutAST(ast) {
    const strings = new Map(), words = [0], types = [];
    let objects = 0, arrays = 0;
    function stringId(s) {
        if (!strings.has(s)) strings.set(s, strings.size);
        return strings.get(s);
    }
    function write(value) {
        if (typeof value === 'string') { types.push(6); words.push(stringId(value)); }
        else if (typeof value === 'number') { types.push(11); words.push(value); }
        else if (Array.isArray(value)) {
            types.push(8); arrays++; words.push(value.length); value.forEach(write);
        } else {
            types.push(9); objects++;
            const entries = Object.entries(value); words.push(entries.length);
            for (const [key, child] of entries) { words.push(stringId(key)); write(child); }
        }
    }
    write(ast); words[0] = strings.size;
    const lane = Buffer.concat(words.map(u32));
    const stringData = Buffer.from([...strings.keys()].join('\0') + '\0');
    const body = Buffer.concat([lane, Buffer.alloc((8 - lane.length % 8) % 8), stringData, Buffer.from(types), u32(0xffeedd00)]);
    const header = Buffer.alloc(72);
    header.writeUInt32LE(0x4b563304, 0);
    Buffer.from('7c161274e9069846aff2e63eb59037e7', 'hex').copy(header, 4); // generic format ID
    header.writeUInt32LE(words.length, 32);
    header.writeUInt32LE(stringData.length + types.length, 40);
    header.writeUInt16LE(objects, 44); header.writeUInt16LE(arrays, 46);
    header.writeUInt32LE(body.length, 48); header.writeUInt32LE(body.length, 52);
    return Buffer.concat([header, body]);
}

export function readResource(data) {
    const count = data.readUInt32LE(12), start = 8 + data.readUInt32LE(8), blocks = [];
    for (let i = 0; i < count; i++) {
        const at = start + i * 12, offset = at + 4 + data.readUInt32LE(at + 4);
        blocks.push({type: data.toString('ascii', at, at + 4), data: data.subarray(offset, offset + data.readUInt32LE(at + 8))});
    }
    return blocks;
}
export function resource(version, blocks) {
    const header = Buffer.alloc(16 + blocks.length * 12);
    header.writeUInt16LE(12, 4); header.writeUInt16LE(version, 6);
    header.writeUInt32LE(8, 8); header.writeUInt32LE(blocks.length, 12);
    const parts = [header]; let offset = header.length;
    blocks.forEach((block, i) => {
        const padding = (16 - offset % 16) % 16;
        parts.push(Buffer.alloc(padding)); offset += padding;
        const at = 16 + i * 12;
        header.write(block.type, at, 4, 'ascii');
        header.writeUInt32LE(offset - at - 4, at + 4); header.writeUInt32LE(block.data.length, at + 8);
        parts.push(block.data); offset += block.data.length;
    });
    header.writeUInt32LE(offset, 0); return Buffer.concat(parts);
}

// VPK v1 archive with all data inside the directory file.
export function vpk(files) {
    const groups = new Map(); let offset = 0;
    for (const [path, data] of files) {
        const dot = path.lastIndexOf('.'), slash = path.lastIndexOf('/');
        const ext = path.slice(dot + 1), dir = path.slice(0, slash), name = path.slice(slash + 1, dot);
        if (!groups.has(ext)) groups.set(ext, new Map());
        if (!groups.get(ext).has(dir)) groups.get(ext).set(dir, []);
        const entry = Buffer.alloc(18);
        entry.writeUInt32LE(crc32(data), 0); entry.writeUInt16LE(0x7fff, 6);
        entry.writeUInt32LE(offset, 8); entry.writeUInt32LE(data.length, 12); entry.writeUInt16LE(0xffff, 16);
        groups.get(ext).get(dir).push(Buffer.from(name + '\0'), entry); offset += data.length;
    }
    const tree = [];
    for (const [ext, dirs] of groups) {
        tree.push(Buffer.from(ext + '\0'));
        for (const [dir, entries] of dirs) tree.push(Buffer.from(dir + '\0'), ...entries, Buffer.from([0]));
        tree.push(Buffer.from([0]));
    }
    tree.push(Buffer.from([0]));
    const directory = Buffer.concat(tree);
    return Buffer.concat([u32(0x55aa1234), u32(1), u32(directory.length), directory, ...files.map(([, data]) => data)]);
}
