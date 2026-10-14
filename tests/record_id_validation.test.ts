import test from 'node:test';
import assert from 'node:assert/strict';
import { dbService } from '../src/backend/db.js';

test('dbService rejects invalid, missing, or literal "undefined" record ID safely', async () => {
  const invalidIds = [undefined, null, '', '   ', 'undefined', 'null'];

  for (const id of invalidIds) {
    await assert.rejects(
      async () => {
        await dbService.updateUserCollectionItem('tasks', 'test-user-id', id as any, { title: 'Updated' });
      },
      (err: any) => {
        assert.match(err.message, /Mã bản ghi \(ID\) không hợp lệ hoặc bị thiếu/);
        return true;
      },
      `Should reject update with id: ${id}`
    );

    await assert.rejects(
      async () => {
        await dbService.deleteUserCollectionItem('tasks', 'test-user-id', id as any);
      },
      (err: any) => {
        assert.match(err.message, /Mã bản ghi \(ID\) không hợp lệ hoặc bị thiếu/);
        return true;
      },
      `Should reject delete with id: ${id}`
    );
  }
});
