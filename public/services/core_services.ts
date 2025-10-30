import type { HttpStart, NotificationsStart, ApplicationStart } from '@kbn/core/public';

let httpService: HttpStart | null = null;
let notificationsService: NotificationsStart | null = null;
let applicationService: ApplicationStart | null = null;

export const setCoreServices = (deps: {
  http: HttpStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
}) => {
  httpService = deps.http;
  notificationsService = deps.notifications;
  applicationService = deps.application;
};

export const getHttpService = () => {
  if (!httpService) {
    throw new Error('HTTP service not initialized');
  }
  return httpService;
};

export const getNotificationsService = () => {
  if (!notificationsService) {
    throw new Error('Notifications service not initialized');
  }
  return notificationsService;
};

export const getApplicationService = () => {
  if (!applicationService) {
    throw new Error('Application service not initialized');
  }
  return applicationService;
};
