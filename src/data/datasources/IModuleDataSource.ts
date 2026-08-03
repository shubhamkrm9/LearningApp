import type { Module, ModuleSection } from '@shared/types/models';

export interface IModuleDataSource {
  getModules(): Promise<Module[]>;
  getModuleById(id: string): Promise<Module | null>;
  getModuleSections(moduleId: string): Promise<ModuleSection[]>;
}
