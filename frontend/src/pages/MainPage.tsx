import React, { useState } from 'react';
import { Tabs, ConfigProvider } from 'antd';
import APILookup from './APILookup';
import DirectDBLookup from './DirectDBLookup';

const MainPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>('api');

    const items = [
        {
            key: 'api',
            label: 'API',
            children: <APILookup />,
        },
        {
            key: 'direct',
            label: 'Direct DB',
            children: <DirectDBLookup />,
        },
    ];

    return (
        <ConfigProvider>
            <div style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '20px', paddingBottom: '20px' }}>
                <h2>API & Data Query Test</h2>
                <Tabs
                    defaultActiveKey="api"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}  // Use items for Ant Design v5
                />
            </div>
        </ConfigProvider>
    );
};

export default MainPage;