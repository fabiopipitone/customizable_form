import { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type {
  FormConfig,
  FormConnectorConfig,
  FormFieldConfig,
  SupportedConnectorTypeId,
} from './types';
import { DEFAULT_STRING_SIZE } from './constants';

const getConnectorFallbackLabel = (index: number) =>
  i18n.translate('customizableForm.builder.connectorFallbackLabel', {
    defaultMessage: 'Connector {number}',
    values: { number: index + 1 },
  });

export interface UseFormConfigStateParams {
  initialConfig: FormConfig;
}

interface ConnectorDataArgs {
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  defaultTemplate: string;
}

interface ConnectorMutationArgs {
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
}

export const useFormConfigState = ({
  initialConfig,
}: UseFormConfigStateParams) => {
  const [formConfig, setFormConfig] = useState<FormConfig>(initialConfig);
  const fieldCounter = useRef<number>(initialConfig.fields.length);
  const connectorCounter = useRef<number>(initialConfig.connectors.length);

  const replaceFormConfig = useCallback((nextConfig: FormConfig) => {
    setFormConfig(nextConfig);
    fieldCounter.current = nextConfig.fields.length;
    connectorCounter.current = nextConfig.connectors.length;
  }, []);

  const updateConfig = useCallback((partial: Partial<FormConfig>) => {
    setFormConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateField = useCallback((fieldId: string, changes: Partial<FormFieldConfig>) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.id === fieldId ? { ...field, ...changes } : field)),
    }));
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }));
  }, []);

  const handleFieldReorder = useCallback((sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) {
      return;
    }

    setFormConfig((prev) => {
      if (
        sourceIndex < 0 ||
        destinationIndex < 0 ||
        sourceIndex >= prev.fields.length ||
        destinationIndex >= prev.fields.length
      ) {
        return prev;
      }

      const nextFields = [...prev.fields];
      const [moved] = nextFields.splice(sourceIndex, 1);
      nextFields.splice(destinationIndex, 0, moved);

      return {
        ...prev,
        fields: nextFields,
      };
    });
  }, []);

  const addField = useCallback(() => {
    fieldCounter.current += 1;
    const n = fieldCounter.current;
    const newField: FormFieldConfig = {
      id: `field-${n}`,
      key: `field_${n}`,
      label: i18n.translate('customizableForm.builder.newFieldLabel', {
        defaultMessage: 'Field {position}',
        values: { position: n },
      }),
      placeholder: '',
      type: 'text',
      required: false,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    };

    setFormConfig((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
  }, []);

  const addConnector = useCallback(
    ({ connectorTypes, connectors, defaultTemplate }: ConnectorDataArgs) => {
      connectorCounter.current += 1;
      const index = connectorCounter.current;

      setFormConfig((prev) => {
        const takenConnectorIds = new Set(
          prev.connectors.map((item) => item.connectorId).filter((id): id is string => Boolean(id))
        );

        const defaultTypeId = connectorTypes[0]?.id ?? '';
        const connectorsForType = defaultTypeId
          ? connectors.filter((connector) => connector.actionTypeId === defaultTypeId)
          : [];
        const availableConnectorsForType = connectorsForType.filter(
          (connector) => !takenConnectorIds.has(connector.id)
        );
        const defaultConnectorId = availableConnectorsForType[0]?.id ?? '';

        const selectedType = defaultTypeId
          ? connectorTypes.find((type) => type.id === defaultTypeId) ?? null
          : null;
        const selectedConnector = defaultConnectorId
          ? connectors.find((connector) => connector.id === defaultConnectorId) ?? null
          : null;

        const defaultLabel =
          selectedConnector?.name ?? selectedType?.name ?? getConnectorFallbackLabel(prev.connectors.length);

        const newConnector: FormConnectorConfig = {
          id: `connector-${index}`,
          connectorTypeId: defaultTypeId,
          connectorId: defaultConnectorId,
          label: defaultLabel,
          isLabelAuto: true,
          documentTemplate: defaultTemplate,
        };

        return {
          ...prev,
          connectors: [...prev.connectors, newConnector],
        };
      });
    },
    []
  );

  const removeConnector = useCallback((connectorConfigId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      connectors: prev.connectors.filter((item) => item.id !== connectorConfigId),
    }));
  }, []);

  const updateConnectorState = useCallback(
    (
      connectorConfigId: string,
      updater: (connector: FormConnectorConfig, index: number, all: FormConnectorConfig[]) => FormConnectorConfig
    ) => {
      setFormConfig((prev) => ({
        ...prev,
        connectors: prev.connectors.map((connector, index, array) =>
          connector.id === connectorConfigId ? updater(connector, index, array) : connector
        ),
      }));
    },
    []
  );

  const handleConnectorTypeChange = useCallback(
    (
      connectorConfigId: string,
      canonicalNextTypeId: SupportedConnectorTypeId | '',
      { connectorTypes, connectors }: ConnectorMutationArgs
    ) => {
      updateConnectorState(connectorConfigId, (connector, index, all) => {
        if (connector.connectorTypeId === canonicalNextTypeId) {
          return connector;
        }

        const wasLabelAuto = connector.isLabelAuto ?? true;

        const connectorsForTypeAll = canonicalNextTypeId
          ? connectors.filter((c) => c.actionTypeId === canonicalNextTypeId)
          : [];

        const takenConnectorIds = new Set(
          all
            .filter((item) => item.id !== connectorConfigId)
            .map((item) => item.connectorId)
            .filter((id): id is string => Boolean(id))
        );

        const availableConnectorsForType = connectorsForTypeAll.filter(
          (item) => !takenConnectorIds.has(item.id)
        );

        const currentConnectorIsAvailable = connector.connectorId
          ? availableConnectorsForType.some((item) => item.id === connector.connectorId)
          : false;

        const nextConnectorIdValue = currentConnectorIsAvailable
          ? connector.connectorId
          : availableConnectorsForType[0]?.id ?? '';

        const selectedType = canonicalNextTypeId
          ? connectorTypes.find((type) => type.id === canonicalNextTypeId) ?? null
          : null;
        const selectedConnector = nextConnectorIdValue
          ? connectors.find((item) => item.id === nextConnectorIdValue) ?? null
          : null;

        const defaultLabel =
          selectedConnector?.name ?? selectedType?.name ?? getConnectorFallbackLabel(index);

        return {
          ...connector,
          connectorTypeId: canonicalNextTypeId,
          connectorId: nextConnectorIdValue,
          label: wasLabelAuto ? defaultLabel : connector.label,
          isLabelAuto: wasLabelAuto,
        };
      });
    },
    [updateConnectorState]
  );

  const handleConnectorChange = useCallback(
    (
      connectorConfigId: string,
      nextConnectorId: string,
      { connectorTypes, connectors }: ConnectorMutationArgs
    ) => {
      updateConnectorState(connectorConfigId, (connector, index, all) => {
        const takenConnectorIds = new Set(
          all
            .filter((item) => item.id !== connectorConfigId)
            .map((item) => item.connectorId)
            .filter((id): id is string => Boolean(id))
        );

        const connectorsForTypeAll = connector.connectorTypeId
          ? connectors.filter((item) => item.actionTypeId === connector.connectorTypeId)
          : [];

        const availableConnectorsForType = connectorsForTypeAll.filter(
          (item) => !takenConnectorIds.has(item.id)
        );

        const requestedConnectorIsAvailable = nextConnectorId
          ? availableConnectorsForType.some((item) => item.id === nextConnectorId)
          : false;

        const nextConnectorIdValue = requestedConnectorIsAvailable
          ? nextConnectorId
          : availableConnectorsForType[0]?.id ?? '';

        const selectedConnectorInstance = nextConnectorIdValue
          ? connectors.find((item) => item.id === nextConnectorIdValue) ?? null
          : null;
        const selectedType = connector.connectorTypeId
          ? connectorTypes.find((type) => type.id === connector.connectorTypeId) ?? null
          : null;
        const defaultLabel =
          selectedConnectorInstance?.name ?? selectedType?.name ?? getConnectorFallbackLabel(index);

        const wasLabelAuto = connector.isLabelAuto ?? true;

        return {
          ...connector,
          connectorId: nextConnectorIdValue,
          label: wasLabelAuto ? defaultLabel : connector.label,
          isLabelAuto: wasLabelAuto,
        };
      });
    },
    [updateConnectorState]
  );

  const handleConnectorLabelChange = useCallback((connectorConfigId: string, label: string) => {
    updateConnectorState(connectorConfigId, (connector) => ({
      ...connector,
      label,
      isLabelAuto: false,
    }));
  }, [updateConnectorState]);

  const handleConnectorTemplateChange = useCallback(
    (connectorConfigId: string, template: string) => {
      updateConnectorState(connectorConfigId, (connector) => ({
        ...connector,
        documentTemplate: template,
      }));
    },
    [updateConnectorState]
  );

  const syncConnectorSelections = useCallback(
    ({ connectorTypes, connectors }: ConnectorMutationArgs) => {
      setFormConfig((prev) => {
        if (prev.connectors.length === 0) {
          return prev;
        }

        const validTypeIds = new Set(connectorTypes.map((type) => type.id));
        let hasChanges = false;

        const nextConnectors = prev.connectors.map((connectorConfig, index) => {
          let nextTypeId = connectorConfig.connectorTypeId;
          const currentTypeIsValid =
            typeof nextTypeId === 'string' && nextTypeId
              ? validTypeIds.has(nextTypeId as SupportedConnectorTypeId)
              : false;

          if (!currentTypeIsValid) {
            nextTypeId = connectorTypes[0]?.id ?? '';
            hasChanges = true;
          }

          const connectorsForType = nextTypeId
            ? connectors.filter((connector) => connector.actionTypeId === nextTypeId)
            : [];

          const takenConnectorIds = new Set(
            prev.connectors
              .filter((item) => item.id !== connectorConfig.id)
              .map((item) => item.connectorId)
              .filter((id): id is string => Boolean(id))
          );

          const availableConnectorsForType = connectorsForType.filter(
            (connector) => !takenConnectorIds.has(connector.id)
          );

          let resolvedConnectorId = connectorConfig.connectorId;
          const connectorIsValid =
            resolvedConnectorId && availableConnectorsForType.some((c) => c.id === resolvedConnectorId);

          if (!connectorIsValid) {
            resolvedConnectorId = availableConnectorsForType[0]?.id ?? '';
            if (connectorConfig.connectorId !== resolvedConnectorId) {
              hasChanges = true;
            }
          }

          const wasLabelAuto = connectorConfig.isLabelAuto ?? true;
          const selectedConnectorInstance = resolvedConnectorId
            ? connectors.find((connector) => connector.id === resolvedConnectorId) ?? null
            : null;
          const selectedType = nextTypeId
            ? connectorTypes.find((type) => type.id === nextTypeId) ?? null
            : null;
          const defaultLabel =
            selectedConnectorInstance?.name ?? selectedType?.name ?? getConnectorFallbackLabel(index);

          return {
            ...connectorConfig,
            connectorTypeId: nextTypeId,
            connectorId: resolvedConnectorId,
            label: wasLabelAuto ? defaultLabel : connectorConfig.label,
            isLabelAuto: wasLabelAuto,
          };
        });

        if (!hasChanges) {
          return prev;
        }

        return {
          ...prev,
          connectors: nextConnectors,
        };
      });
    },
    []
  );

  return {
    formConfig,
    replaceFormConfig,
    updateConfig,
    updateField,
    removeField,
    addField,
    handleFieldReorder,
    addConnector,
    removeConnector,
    handleConnectorTypeChange,
    handleConnectorChange,
    handleConnectorLabelChange,
    handleConnectorTemplateChange,
    syncConnectorSelections,
  };
};
