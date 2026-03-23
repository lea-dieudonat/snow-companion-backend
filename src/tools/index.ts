import { getWeatherTool } from './get-weather.tool';
import { getStationsTool } from './get-stations.tool';
import { getStationActivitiesTool } from './get-station-activities.tool';
import { getUserSessionsTool } from './get-user-sessions.tool';
import { getUserFavoritesTool } from './get-user-favorites.tool';
import { compareStationsTool } from './compare-stations.tool';
import { getSlopeConditionsTool } from './get-slope-conditions.tool';
import type { AgentTool } from '@/types/agent.types';

export function getTools(): AgentTool[] {
  return [
    getWeatherTool,
    getSlopeConditionsTool,
    getStationsTool,
    getStationActivitiesTool,
    getUserSessionsTool,
    getUserFavoritesTool,
    compareStationsTool,
  ];
}
