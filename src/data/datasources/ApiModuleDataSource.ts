import type { IModuleDataSource } from './IModuleDataSource';
import type { Module, ModuleSection } from '@shared/types/models';
import { ApiService } from './ApiService';
import { API_URLS, transformVideoListToSections, type ApiVideo } from './ApiConfig';

export class ApiModuleDataSource implements IModuleDataSource {
  async getModules(): Promise<Module[]> {
    // Implement API call when backend is ready
    throw new Error('API not fully implemented for getModules');
  }

  async getModuleById(id: string): Promise<Module | null> {
    throw new Error('API not fully implemented for getModuleById');
  }

  async getModuleSections(moduleId: string): Promise<ModuleSection[]> {
    const videos = await ApiService.get<ApiVideo[]>(API_URLS.VIDEOS_LIST);
    if (videos && videos.length > 0) {
      return transformVideoListToSections(videos, moduleId);
    }
    return [];
  }
}
