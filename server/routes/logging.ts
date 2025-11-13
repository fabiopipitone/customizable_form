import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

const logConnectorSchema = schema.object(
  {
    id: schema.string(),
    label: schema.maybe(schema.string()),
    type: schema.maybe(schema.string()),
    connector_id: schema.maybe(schema.string()),
    payload: schema.maybe(schema.any()),
    raw_payload: schema.string(),
  },
  { unknowns: 'forbid' }
);

const logSubmissionSchema = schema.object(
  {
    '@timestamp': schema.maybe(schema.string()),
    form_title: schema.maybe(schema.string()),
    form_description: schema.maybe(schema.string()),
    fields: schema.maybe(schema.recordOf(schema.string(), schema.any(), { defaultValue: {} })),
    connectors: schema.arrayOf(logConnectorSchema),
  },
  { unknowns: 'forbid' }
);

const ROUTE_SECURITY = {
  authz: { enabled: false as const, reason: 'Relies on saved object authorization' },
  authc: { enabled: true as const },
};

export const registerLoggingRoutes = (router: IRouter) => {
  router.post(
    {
      path: '/api/customizable_form/log_submission',
      validate: {
        body: logSubmissionSchema,
      },
      security: ROUTE_SECURITY,
    },
    async (context, request, response) => {
      const core = await context.core;
      const esClient = core.elasticsearch.client.asInternalUser;

      const { connectors, fields = {}, form_title, form_description } = request.body;
      const timestampInput = request.body['@timestamp'];
      const timestamp = !timestampInput || Number.isNaN(Date.parse(timestampInput))
        ? new Date().toISOString()
        : timestampInput;

      const yearMonth = timestamp.slice(0, 7).replace('-', '');
      const index = `.kibana_customizable-form-logs-${yearMonth}`;

      try {
        await esClient.index({
          index,
          document: {
            '@timestamp': timestamp,
            form_title,
            form_description,
            fields,
            connectors,
          },
        });

        return response.ok({ body: { acknowledged: true } });
      } catch (error) {
        const err = error as { meta?: { body?: { error?: { type?: string; reason?: string } } } };
        const statusCode =
          err?.meta?.body?.error?.type === 'security_exception' ? 403 : 500;
        const message =
          err?.meta?.body?.error?.reason ?? (error as Error).message ?? 'Failed to log submission';
        return response.customError({
          statusCode,
          body: { message },
        });
      }
    }
  );
};
