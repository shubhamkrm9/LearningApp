import type { IModuleDataSource } from './IModuleDataSource';
import type { Module, ModuleSection } from '@shared/types/models';
import { mockModules, mockModuleSections } from '@data/mocks/mockModules';

export class MockModuleDataSource implements IModuleDataSource {
  async getModules(): Promise<Module[]> {
    return Promise.resolve(mockModules);
  }

  async getModuleById(id: string): Promise<Module | null> {
    const mod = mockModules.find((m) => m.id === id);
    return Promise.resolve(mod || null);
  }

  async getModuleSections(moduleId: string): Promise<ModuleSection[]> {
    return Promise.resolve(mockModuleSections[moduleId] || []);
  }
}
