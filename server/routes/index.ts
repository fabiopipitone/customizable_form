import type { IRouter } from '@kbn/core/server';
import { registerFormRoutes } from './forms';
import { registerLoggingRoutes } from './logging';

export const defineRoutes = (router: IRouter) => {
  registerFormRoutes(router);
  registerLoggingRoutes(router);
};
