/**
 * Learning Module SDK - Module Slice
 *
 * Manages module listing and selection.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Module } from '@shared/types/module';

export interface ModuleState {
  modules: Module[];
  selectedModule: Module | null;
  loading: boolean;
  error: string | null;
}

const initialState: ModuleState = {
  modules: [],
  selectedModule: null,
  loading: false,
  error: null,
};

const moduleSlice = createSlice({
  name: 'module',
  initialState,
  reducers: {
    setModules(state, action: PayloadAction<Module[]>) {
      state.modules = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelectedModule(state, action: PayloadAction<Module | null>) {
      state.selectedModule = action.payload;
    },
    updateModule(state, action: PayloadAction<Module>) {
      const index = state.modules.findIndex((m) => m.id === action.payload.id);
      if (index !== -1) {
        state.modules[index] = action.payload;
      }
      if (state.selectedModule?.id === action.payload.id) {
        state.selectedModule = action.payload;
      }
    },
    clearModules() {
      return initialState;
    },
    setModuleLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setModuleError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
  selectors: {
    selectModules: (state) => state.modules,
    selectSelectedModule: (state) => state.selectedModule,
    selectModuleLoading: (state) => state.loading,
    selectModuleError: (state) => state.error,
    selectUnlockedModules: (state) =>
      state.modules.filter((m) => !m.isLocked),
    selectCompletedModules: (state) =>
      state.modules.filter((m) => m.isCompleted),
  },
});

export const {
  setModules,
  setSelectedModule,
  updateModule,
  clearModules,
  setModuleLoading,
  setModuleError,
} = moduleSlice.actions;

export const {
  selectModules,
  selectSelectedModule,
  selectModuleLoading,
  selectModuleError,
  selectUnlockedModules,
  selectCompletedModules,
} = moduleSlice.selectors;

export default moduleSlice.reducer;
