import { apiFetch } from './client';

const setupAPI = {
  getTrackSkill: () => apiFetch('/api/setup/track-skill'),
};

export default setupAPI;
