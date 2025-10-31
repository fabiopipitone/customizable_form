import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';

const formAttributesSchema = schema.object(
  {
    title: schema.string(),
    description: schema.maybe(schema.string()),
    showTitle: schema.maybe(schema.boolean()),
    showDescription: schema.maybe(schema.boolean()),
    formConfig: schema.maybe(schema.any()),
  },
  { unknowns: 'allow' }
);

const referenceSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    name: schema.maybe(schema.string()),
  },
  { unknowns: 'forbid' }
);

const referencesSchema = schema.arrayOf(referenceSchema);

const savedObjectSchema = schema.object(
  {
    id: schema.string(),
    type: schema.string(),
    version: schema.maybe(schema.string()),
    createdAt: schema.maybe(schema.string()),
    updatedAt: schema.maybe(schema.string()),
    createdBy: schema.maybe(schema.string()),
    updatedBy: schema.maybe(schema.string()),
    managed: schema.maybe(schema.boolean()),
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
    originId: schema.maybe(schema.string()),
    error: schema.maybe(
      schema.object(
        {
          error: schema.string(),
          message: schema.string(),
          statusCode: schema.number(),
          metadata: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        },
        { unknowns: 'forbid' }
      )
    ),
    attributes: formAttributesSchema,
    references: referencesSchema,
  },
  { unknowns: 'allow' }
);

const metaSchema = schema.object(
  {
    outcome: schema.oneOf([
      schema.literal('exactMatch'),
      schema.literal('aliasMatch'),
      schema.literal('conflict'),
    ]),
    aliasTargetId: schema.maybe(schema.string()),
    aliasPurpose: schema.maybe(
      schema.oneOf([
        schema.literal('savedObjectConversion'),
        schema.literal('savedObjectImport'),
      ])
    ),
  },
  { unknowns: 'forbid' }
);

export const cmServicesDefinition: { [version: number]: ServicesDefinition } = {
  1: {
    get: {
      out: {
        result: {
          schema: schema.object(
            {
              item: savedObjectSchema,
              meta: metaSchema,
            },
            { unknowns: 'forbid' }
          ),
        },
      },
    },
    create: {
      in: {
        data: {
          schema: formAttributesSchema,
        },
        options: {
          schema: schema.object(
            {
              references: schema.maybe(referencesSchema),
              overwrite: schema.maybe(schema.boolean()),
            },
            { unknowns: 'forbid' }
          ),
        },
      },
      out: {
        result: {
          schema: schema.object(
            {
              item: savedObjectSchema,
            },
            { unknowns: 'forbid' }
          ),
        },
      },
    },
    update: {
      in: {
        data: {
          schema: formAttributesSchema,
        },
        options: {
          schema: schema.object(
            {
              references: schema.maybe(referencesSchema),
              overwrite: schema.maybe(schema.boolean()),
            },
            { unknowns: 'forbid' }
          ),
        },
      },
      out: {
        result: {
          schema: schema.object(
            {
              item: savedObjectSchema,
            },
            { unknowns: 'forbid' }
          ),
        },
      },
    },
    delete: {},
    search: {
      out: {
        result: {
          schema: schema.object(
            {
              hits: schema.arrayOf(savedObjectSchema),
              pagination: schema.object(
                {
                  total: schema.number(),
                  cursor: schema.maybe(schema.string()),
                },
                { unknowns: 'forbid' }
              ),
            },
            { unknowns: 'forbid' }
          ),
        },
      },
    },
    mSearch: {
      out: {
        result: {
          schema: savedObjectSchema,
        },
      },
    },
  },
};
