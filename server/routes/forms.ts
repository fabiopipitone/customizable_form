import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObjectReference } from '@kbn/core/server';
import { CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE } from '../../common';

const formConfigSchema = schema.object({}, { unknowns: 'allow' });

const saveBodySchema = schema.object({
  formConfig: formConfigSchema,
});

const withIdParamsSchema = schema.object({
  id: schema.string(),
});

const findQuerySchema = schema.object({
  search: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number({ min: 1, max: 1000 })),
  page: schema.maybe(schema.number({ min: 1 })),
  fields: schema.maybe(schema.arrayOf(schema.string())),
});

const extractConnectorReferences = (formConfig: unknown): SavedObjectReference[] => {
  if (!formConfig || typeof formConfig !== 'object') {
    return [];
  }

  const connectors = Array.isArray((formConfig as any).connectors)
    ? ((formConfig as any).connectors as unknown[])
    : [];

  const seen = new Set<string>();

  return connectors
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const connectorId = (item as any).connectorId;
      const connectorTypeId = (item as any).connectorTypeId;
      if (typeof connectorId !== 'string' || connectorId.trim() === '') {
        return null;
      }
      // Only accept connectors with a supported type.
      if (connectorTypeId && typeof connectorTypeId !== 'string') {
        return null;
      }
      if (seen.has(connectorId)) {
        return null;
      }

      seen.add(connectorId);

      return {
        id: connectorId,
        type: 'action',
        name: `connector_${index}`,
      } satisfies SavedObjectReference;
    })
    .filter((ref): ref is SavedObjectReference => ref !== null);
};

const toSavedObjectAttributes = (formConfig: any) => {
  const title =
    typeof formConfig?.title === 'string' && formConfig.title.trim().length > 0
      ? formConfig.title
      : 'Untitled form';
  const description = typeof formConfig?.description === 'string' ? formConfig.description : '';
  const showTitle =
    typeof formConfig?.showTitle === 'boolean' ? formConfig.showTitle : formConfig?.showTitle !== false;
  const showDescription =
    typeof formConfig?.showDescription === 'boolean'
      ? formConfig.showDescription
      : formConfig?.showDescription !== false;

  return {
    title,
    description,
    showTitle,
    showDescription,
    formConfig,
  };
};

const buildErrorResponsePayload = (error: unknown, fallbackMessage: string) => {
  if (error && typeof error === 'object') {
    const maybeBoomLike = error as {
      statusCode?: number;
      message?: string;
      output?: { statusCode?: number; payload?: { message?: string } };
    };

    const statusCode =
      maybeBoomLike.statusCode ??
      maybeBoomLike.output?.statusCode ??
      500;

    const message =
      maybeBoomLike.message ??
      maybeBoomLike.output?.payload?.message ??
      fallbackMessage;

    return {
      statusCode,
      body: { message },
    };
  }

  return {
    statusCode: 500,
    body: { message: fallbackMessage },
  };
};

export const registerFormRoutes = (router: IRouter) => {
  router.get(
    {
      path: '/api/customizable_form/forms',
      validate: {
        query: findQuerySchema,
      },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const { search, perPage, page, fields } = request.query;

      try {
        const result = await soClient.find({
          type: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
          search: search ? `${search}*` : undefined,
          searchFields: search ? ['title', 'description'] : undefined,
          perPage,
          page,
          fields,
        });

        return response.ok({
          body: {
            savedObjects: result.saved_objects,
            total: result.total,
            perPage: result.per_page,
            page: result.page,
          },
        });
      } catch (error) {
        const errorPayload = buildErrorResponsePayload(error, 'Failed to list customizable forms.');
        return response.customError(errorPayload);
      }
    }
  );

  router.post(
    {
      path: '/api/customizable_form/forms',
      validate: {
        body: saveBodySchema,
      },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const { formConfig } = request.body;

      try {
        const savedObject = await soClient.create(
          CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
          toSavedObjectAttributes(formConfig),
          {
            references: extractConnectorReferences(formConfig),
          }
        );
        return response.ok({
          body: {
            savedObject,
          },
        });
      } catch (error) {
        const errorPayload = buildErrorResponsePayload(
          error,
          'Failed to create customizable form.'
        );
        return response.customError(errorPayload);
      }
    }
  );

  router.put(
    {
      path: '/api/customizable_form/forms/{id}',
      validate: {
        params: withIdParamsSchema,
        body: saveBodySchema,
      },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const { formConfig } = request.body;
      const { id } = request.params;

      try {
        const savedObject = await soClient.update(
          CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
          id,
          toSavedObjectAttributes(formConfig),
          {
            references: extractConnectorReferences(formConfig),
          }
        );

        return response.ok({
          body: {
            savedObject,
          },
        });
      } catch (error) {
        const errorPayload = buildErrorResponsePayload(
          error,
          'Failed to update customizable form.'
        );
        return response.customError(errorPayload);
      }
    }
  );

  router.get(
    {
      path: '/api/customizable_form/forms/{id}',
      validate: {
        params: withIdParamsSchema,
      },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const { id } = request.params;

      try {
        const savedObject = await soClient.get(CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE, id);
        return response.ok({
          body: {
            savedObject,
          },
        });
      } catch (error) {
        const errorPayload = buildErrorResponsePayload(error, 'Failed to load customizable form.');
        return response.customError(errorPayload);
      }
    }
  );

  router.get(
    {
      path: '/api/customizable_form/forms/{id}/resolve',
      validate: {
        params: withIdParamsSchema,
      },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const { id } = request.params;

      try {
        const resolveResult = await soClient.resolve(CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE, id);
        return response.ok({
          body: resolveResult,
        });
      } catch (error) {
        const errorPayload = buildErrorResponsePayload(
          error,
          'Failed to resolve customizable form.'
        );
        return response.customError(errorPayload);
      }
    }
  );

  router.delete(
    {
      path: '/api/customizable_form/forms/{id}',
      validate: {
        params: withIdParamsSchema,
      },
    },
    async (context, request, response) => {
      const soClient = context.core.savedObjects.client;
      const { id } = request.params;

      try {
        await soClient.delete(CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE, id);
        return response.ok({
          body: { id },
        });
      } catch (error) {
        const errorPayload = buildErrorResponsePayload(error, 'Failed to delete customizable form.');
        return response.customError(errorPayload);
      }
    }
  );
};
