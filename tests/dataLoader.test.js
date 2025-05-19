import assert from 'assert';
import { DataLoader } from '../src/js/data.js';

// Simple FileReader mock for Node environment
class FakeFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }
  readAsText(file) {
    setImmediate(() => {
      try {
        let content;
        if (typeof file === 'string') {
          content = file;
        } else if (file && typeof file.content === 'string') {
          content = file.content;
        } else {
          throw new Error('Unsupported file type');
        }
        this.result = content;
        if (this.onload) this.onload({ target: { result: content } });
      } catch (err) {
        if (this.onerror) this.onerror(err);
      }
    });
  }
}

async function testParseCSVLine() {
  const loader = new DataLoader();
  const line = '1,"a,b",3';
  const result = loader.parseCSVLine(line);
  assert.deepStrictEqual(result, ['1', 'a,b', '3']);
  console.log('parseCSVLine test passed');
}

async function testParseCSV() {
  global.FileReader = FakeFileReader;
  const loader = new DataLoader();
  const csv = 'id,value\n1,2.5\n3,abc';
  const data = await loader.parseCSV(csv);
  assert.strictEqual(data[0].id, 1);
  assert.strictEqual(data[0].value, 2.5);
  assert.strictEqual(data[1].id, 3);
  assert.strictEqual(data[1].value, 'abc');
  assert.strictEqual(typeof data[0].id, 'number');
  assert.strictEqual(typeof data[0].value, 'number');
  console.log('parseCSV numeric conversion test passed');
  delete global.FileReader;
}

async function run() {
  await testParseCSVLine();
  await testParseCSV();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
