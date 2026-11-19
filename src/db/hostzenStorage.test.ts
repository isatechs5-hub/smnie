import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStorageObjectPath,
  formatHostzenStorageUri,
  getHostzenStorageObjectUrl,
  parseHostzenStorageUri,
  sanitizeStorageSegment,
  WEBSITE_MEDIA_FILES,
} from './hostzenStorage';
import { NIEM_MEDIA } from '../lib/media';

test('sanitizeStorageSegment strips traversal and unsafe characters', () => {
  assert.equal(sanitizeStorageSegment('../../secret/file name.png'), 'secret-file-name.png');
  assert.equal(sanitizeStorageSegment('   NIEM-2026-ENG-1001  '), 'NIEM-2026-ENG-1001');
  assert.equal(sanitizeStorageSegment('///', 'fallback'), 'fallback');
});

test('buildStorageObjectPath builds clean folder paths for certificates, applications, and website images', () => {
  assert.equal(
    buildStorageObjectPath('certificates', 'NIEM-2026-1001', 'Official Diploma (1).PNG'),
    'certificates/NIEM-2026-1001/Official-Diploma-1.png'
  );
  assert.equal(
    buildStorageObjectPath('applications', 'NIEM-APP-2026-ABC123', 'marksheet final.pdf'),
    'applications/NIEM-APP-2026-ABC123/marksheet-final.pdf'
  );
  assert.equal(
    buildStorageObjectPath('website', 'hero', 'nie-building.JPG'),
    'website/nie-building.jpg'
  );
});

test('formatHostzenStorageUri and parseHostzenStorageUri round-trip cleanly and reject invalid URIs', () => {
  const uri = formatHostzenStorageUri('niem-media', 'certificates/NIEM-2026-1001/cert.png');
  assert.equal(uri, 'hostzen://niem-media/certificates/NIEM-2026-1001/cert.png');

  const parsed = parseHostzenStorageUri(uri);
  assert.deepEqual(parsed, {
    bucket: 'niem-media',
    objectPath: 'certificates/NIEM-2026-1001/cert.png',
  });

  assert.equal(parseHostzenStorageUri('local-disk-file.png'), null);
  assert.equal(parseHostzenStorageUri('hostzen://niem-media/../etc/passwd'), null);
  assert.equal(parseHostzenStorageUri('hostzen://niem-media/'), null);

  assert.equal(
    getHostzenStorageObjectUrl(uri),
    'https://hostzens.com/storage/v1/object/niem-media/certificates/NIEM-2026-1001/cert.png'
  );
  assert.equal(getHostzenStorageObjectUrl('invalid-uri'), null);
});

test('all 10 NIEM_MEDIA assets and WEBSITE_MEDIA_FILES exist on disk with zero legacy image files', () => {
  const mediaValues = Object.values(NIEM_MEDIA);
  assert.equal(mediaValues.length, 10);
  for (const webPath of mediaValues) {
    assert.ok(webPath.startsWith('/assets/aistudio/'), `Expected local asset path, got ${webPath}`);
    const absPath = path.resolve(process.cwd(), 'public', webPath.replace(/^\/+/, ''));
    assert.equal(fs.existsSync(absPath), true, `Missing asset on disk: ${absPath}`);
  }

  const storageEntries = Object.values(WEBSITE_MEDIA_FILES);
  assert.equal(storageEntries.length, 10);
  for (const meta of storageEntries) {
    const absPath = path.resolve(process.cwd(), meta.localRelativePath);
    assert.equal(fs.existsSync(absPath), true, `Missing storage sync asset: ${absPath}`);
  }
});
