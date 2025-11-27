/**
 * IndexedDB 存储引擎
 * 使用 Dexie.js 封装，提供给 Zustand persist 使用
 */

import Dexie, { type Table } from 'dexie';

// 定义数据库结构
interface KeyValueStore {
  key: string;
  value: string;
}

class DinoStoryDB extends Dexie {
  kvStore!: Table<KeyValueStore, string>;

  constructor() {
    super('DinoStoryDB');
    
    // 定义数据库版本和表结构
    this.version(1).stores({
      kvStore: 'key' // 主键为 key
    });
  }
}

// 创建数据库实例
const db = new DinoStoryDB();

/**
 * IndexedDB 存储引擎（兼容 Zustand persist 接口）
 */
export const indexedDBStorage = {
  /**
   * 获取存储的数据
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      const item = await db.kvStore.get(name);
      return item?.value || null;
    } catch (error) {
      console.error('IndexedDB getItem error:', error);
      return null;
    }
  },
  
  /**
   * 保存数据
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await db.kvStore.put({ key: name, value });
      console.log(`✅ Saved to IndexedDB: ${name}, size: ${(value.length / 1024).toFixed(2)}KB`);
    } catch (error) {
      console.error('IndexedDB setItem error:', error);
      throw error;
    }
  },
  
  /**
   * 删除数据
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      await db.kvStore.delete(name);
    } catch (error) {
      console.error('IndexedDB removeItem error:', error);
      throw error;
    }
  },
};

/**
 * 获取数据库统计信息（调试用）
 */
export const getDBStats = async () => {
  try {
    const count = await db.kvStore.count();
    const items = await db.kvStore.toArray();
    const totalSize = items.reduce((sum, item) => sum + item.value.length, 0);
    
    return {
      count,
      totalSize: (totalSize / 1024).toFixed(2) + 'KB',
      items: items.map(item => ({
        key: item.key,
        size: (item.value.length / 1024).toFixed(2) + 'KB'
      }))
    };
  } catch (error) {
    console.error('Get DB stats error:', error);
    return null;
  }
};

