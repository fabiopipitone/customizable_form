import type { CoreStart } from '@kbn/core/public';

export interface SubmissionLogConnector {
  id: string;
  label?: string;
  type?: string;
  connector_id?: string;
  payload: unknown;
  raw_payload: string;
}

export interface SubmissionLogPayload {
  '@timestamp': string;
  form_title?: string;
  form_description?: string;
  fields: Record<string, unknown>;
  connectors: SubmissionLogConnector[];
}

export const logSubmission = async (
  http: CoreStart['http'],
  payload: SubmissionLogPayload
): Promise<void> => {
  await http.post('/api/customizable_form/log_submission', {
    body: JSON.stringify(payload),
  });
};
