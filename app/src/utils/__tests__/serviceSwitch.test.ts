/* ============================================================
   服务切换测试文件
   用于验证 IndexedDB 和 API 实现的切换机制
   ============================================================ */

import { describe, it, expect } from 'vitest';
import { validateServiceImplementation, testServiceSwitch } from '../serviceValidator';

describe('Service Switch Tests', () => {
  it('should validate IndexedDB service implementation', async () => {
    const { indexedDBTaskService } = await import('../../services/storage/indexeddb');

    const validation = validateServiceImplementation(
      'indexedDBTaskService',
      indexedDBTaskService,
      { prototype: { getAll: {}, getById: {}, create: {}, update: {}, toggleDone: {}, remove: {}, clear: {} } }
    );

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should validate API service implementation', async () => {
    const { apiTaskService } = await import('../../services/storage/api');

    const validation = validateServiceImplementation(
      'apiTaskService',
      apiTaskService,
      { prototype: { getAll: {}, getById: {}, create: {}, update: {}, toggleDone: {}, remove: {}, clear: {} } }
    );

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should test service switching mechanism', async () => {
    const result = await testServiceSwitch();
    expect(result.success).toBe(true);
  });
});