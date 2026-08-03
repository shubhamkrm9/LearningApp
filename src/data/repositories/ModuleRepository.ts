import type { Module, ModuleSection } from '@shared/types/models';
import type { IModuleDataSource } from '../datasources/IModuleDataSource';
import { MockModuleDataSource } from '../datasources/MockModuleDataSource';
import { ApiModuleDataSource } from '../datasources/ApiModuleDataSource';

// Switch this to ApiModuleDataSource when backend is ready
const activeDataSource: IModuleDataSource = new MockModuleDataSource();

export class ModuleRepository {
  static async getModules(): Promise<Module[]> {
    return activeDataSource.getModules();
  }

  static async getModuleById(id: string): Promise<Module | null> {
    return activeDataSource.getModuleById(id);
  }

  static async getModuleSections(moduleId: string): Promise<ModuleSection[]> {
    try {
      // If we are using MockDataSource, we just return from it.
      // If ApiDataSource fails, we can either throw or fallback. 
      // The old behavior fell back to mocks if API was unavailable.
      return await activeDataSource.getModuleSections(moduleId);
    } catch (e) {
      console.log('[ModuleRepository] DataSource failed, falling back to Mock');
      return new MockModuleDataSource().getModuleSections(moduleId);
    }
  }
}
