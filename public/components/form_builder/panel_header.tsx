import React from 'react';
import { EuiTitle } from '@elastic/eui';

export const PanelHeader = ({ title }: { title: string }) => (
  <div
    style={{
      backgroundColor: '#eef3fc',
      padding: '12px 16px',
      borderBottom: '1px solid #d3dae6',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      margin: '-16px -16px 16px -16px',
    }}
  >
    <EuiTitle size="xs">
      <h3 style={{ margin: 0 }}>{title}</h3>
    </EuiTitle>
  </div>
);

export default PanelHeader;
