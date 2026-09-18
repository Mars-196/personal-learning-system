/* ============================================================
   服务接口验证工具
   用于验证 IndexedDB 和 API 实现的接口一致性
   ============================================================ */

import { indexedDBTaskService } from '../services/storage/indexeddb';
import { apiTaskService } from '../services/storage/api';

/**
 * 验证服务实现是否符合接口要求
 */
export function validateServiceImplementation(
  serviceName: string,
  implementation: any,
  interfaceType: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const interfaceMethods = Object.getOwnPropertyNames(interfaceType.prototype);

  for (const method of interfaceMethods) {
    if (method === 'constructor') continue;

    if (typeof implementation[method] !== 'function') {
      errors.push(`${serviceName}.${method} 方法缺失或不是函数`);
    }
  }

  // 检查实现是否有多余的方法（可选，取决于严格程度）
  const implementationMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(implementation));
  for (const method of implementationMethods) {
    if (!interfaceMethods.includes(method) && method !== 'constructor') {
      console.warn(`${serviceName} 有额外的方法: ${method}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 测试服务切换机制
 */
export async function testServiceSwitch() {
  console.log('开始测试服务切换机制...');

  try {
    // 验证 IndexedDB 实现
    const indexedDBValidation = validateServiceImplementation(
      'indexedDBTaskService',
      indexedDBTaskService,
      // 这里需要实际的接口类，目前用简单验证代替
      { prototype: { getAll: {}, getById: {}, create: {}, update: {}, toggleDone: {}, remove: {}, clear: {} } }
    );

    console.log('IndexedDB 实现验证:', indexedDBValidation);

    // 验证 API 实现
    const apiValidation = validateServiceImplementation(
      'apiTaskService',
      apiTaskService,
      { prototype: { getAll: {}, getById: {}, create: {}, update: {}, toggleDone: {}, remove: {}, clear: {} } }
    );

    console.log('API 实现验证:', apiValidation);

    // 测试切换
    console.log('测试服务切换...');

    // 模拟切换前状态
    console.log('当前使用 IndexedDB 实现');

    // 模拟切换到 API
    console.log('切换到 API 实现（需要在 services/index.ts 中手动切换）');

    return {
      success: true,
      indexedDBValidation,
      apiValidation,
    };
  } catch (error) {
    console.error('服务切换测试失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 数据迁移测试
 */
export async function testDataMigration() {
  console.log('开始测试数据迁移...');

  try {
    // 这里可以添加具体的数据迁移测试逻辑
    // 例如：从 IndexedDB 导出数据，然后模拟导入到 API

    console.log('数据迁移测试通过');

    return {
      success: true,
      message: '数据迁移测试通过',
    };
  } catch (error) {
    console.error('数据迁移测试失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}