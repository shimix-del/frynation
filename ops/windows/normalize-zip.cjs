// Windows ZIP creators can assign world-writable Unix permissions. Normalize
// metadata before extracting an application on a shared Linux host.
const fs = require('node:fs');
const file = process.argv[2];
if (!file) throw new Error('Supply the release ZIP path');
const descriptor = fs.openSync(file, 'r+');
try {
  const size = fs.fstatSync(descriptor).size;
  const tail = Buffer.alloc(Math.min(size, 65557));
  fs.readSync(descriptor, tail, 0, tail.length, size - tail.length);
  const end = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 + tail.readUInt16LE(end + 20) !== tail.length) throw new Error('Invalid ZIP directory');
  const count = tail.readUInt16LE(end + 10), length = tail.readUInt32LE(end + 12), offset = tail.readUInt32LE(end + 16);
  if (count === 65535 || length === 0xffffffff || offset === 0xffffffff || offset + length > size) throw new Error('ZIP64 or invalid directory is unsupported');
  const directory = Buffer.alloc(length);
  fs.readSync(descriptor, directory, 0, length, offset);
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    if (directory.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const nameLength = directory.readUInt16LE(cursor + 28), extraLength = directory.readUInt16LE(cursor + 30), commentLength = directory.readUInt16LE(cursor + 32);
    const name = directory.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    if (name.startsWith('/') || name.includes('\\') || name.split('/').includes('..')) throw new Error('Unsafe archive path');
    const isDirectory = name.endsWith('/');
    directory[cursor + 5] = 3; // Unix creator; tools then honor the mode bits.
    directory.writeUInt32LE((((isDirectory ? 0o40755 : 0o100644) << 16) >>> 0) + (isDirectory ? 16 : 0), cursor + 38);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  if (cursor !== length) throw new Error('ZIP directory length mismatch');
  fs.writeSync(descriptor, directory, 0, length, offset);
  console.log(`Normalized ${count} entries: directories 0755, files 0644.`);
} finally { fs.closeSync(descriptor); }
