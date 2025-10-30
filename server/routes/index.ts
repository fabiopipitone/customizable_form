import type { IRouter } from '@kbn/core/server';
import { registerFormRoutes } from './forms';

export const defineRoutes = (router: IRouter) => {
  registerFormRoutes(router);
};
