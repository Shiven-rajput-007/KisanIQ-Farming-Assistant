import { api } from './client';
import type { Crop, CropStageInfo, CropAction } from '@/types';

export const cropApi = {
  getCrops: () =>
    api.get<{
      success: boolean;
      crops: Crop[];
      stages: CropStageInfo[];
      actions: CropAction[];
    }>('/crops'),
  getCropById: (id: string) =>
    api.get<{
      success: boolean;
      crop: Crop;
      stages: CropStageInfo[];
      actions: CropAction[];
    }>(`/crops/${id}`),
  addCrop: (data: Partial<Crop>) =>
    api.post<{ success: boolean; crop: Crop }>('/crops', data),
  updateAction: (actionId: string, completed: boolean) =>
    api.put<{ success: boolean }>(`/crops/actions/${actionId}`, { completed }),
};
