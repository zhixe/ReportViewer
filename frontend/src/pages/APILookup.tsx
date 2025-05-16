import React, { useState } from 'react';
import { Input, Button, Table, message, Space, Typography } from 'antd';
import axios from 'axios';
import { ColumnType } from 'antd/es/table';

const { Text } = Typography;

const APILookup: React.FC = () => {
    const [id, setId] = useState('');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchUserFromAPI = async () => {
        if (!/^[1-9]\d*$/.test(id)) {
            setError('User ID must be a positive integer');
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const res = await axios.get(`/api/user/${id}`);
            setUser(res.data.data);
            if (!res.data.data) message.error('User not found via API');
        } catch (err: any) {
            setUser(null);
            message.error(`Error fetching user from API: ${err.message}`);
        }

        setLoading(false);
    };

    // Clear input and table data
    const handleClear = () => {
        setId('');
        setUser(null);
        setError(null);
    };

    const columns: ColumnType<any>[] = user
        ? Object.keys(user).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            align: 'center' as const,
        }))
        : [];

    const dataSource = user ? [{ ...user, key: user["User ID"] }] : [];

    return (
        <div>
            <h2 style={{ marginTop:0 }}>API Test</h2>
            <Space>
                <Input
                    placeholder="Enter user ID"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    style={{ width: 300 }}
                    onPressEnter={fetchUserFromAPI}
                    status={error ? 'error' : ''}
                    allowClear
                />
                <Button type="primary" onClick={fetchUserFromAPI} loading={loading}>
                    Search
                </Button>
                <Button onClick={handleClear}>
                    Clear
                </Button>
            </Space>

            {error && (
                <Text type="danger" style={{ display: 'block', marginTop: 8 }}>
                    {error}
                </Text>
            )}

            {user ? (
                <Table
                    columns={columns}
                    dataSource={dataSource}
                    style={{ marginTop: 24 }}
                    pagination={false}
                    bordered
                />
            ) : !error && (
                <div style={{
                    minHeight: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    marginTop: 24
                }}>
                    Click "Search" to display user data.
                </div>
            )}
        </div>
    );
};

export default APILookup;