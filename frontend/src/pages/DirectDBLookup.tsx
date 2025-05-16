import React, { useState, useEffect } from 'react';
import {Alert, Button, Table, message, Space, Select, notification} from 'antd';
import axios from 'axios';
import { ColumnType } from 'antd/es/table';

const { Option } = Select;

const DirectDBLookup: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | undefined>();
    const [tableLoading, setTableLoading] = useState(false);
    const [tableTouched, setTableTouched] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    // Fetch available tables on mount
    useEffect(() => {
        const fetchTables = async () => {
            setTableLoading(true);
            try {
                const res = await axios.get('http://localhost:7080/api/query/tables');
                if (res.data.status === 'success') {
                    setTables(res.data.tables);
                } else {
                    message.error(res.data.message || 'Failed to fetch tables');
                }
            } catch (err: any) {
                message.error(err.message || 'Failed to fetch tables');
            }
            setTableLoading(false);
        };
        fetchTables();
    }, []);

    // Fetch Data from selected table
    async function fetchDataOnce() {
        if (!selectedTable) {
            setTableTouched(true);
            message.warning('Please select a table first.');
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:7080/api/query?table=${encodeURIComponent(selectedTable)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Request failed with status: ${response.status} - ${response.statusText}`);
            }
            const result = await response.json();
            if (result.status === 'success') {
                setData(result.data);
                if (result.data.length === 0) {
                    setAlert({ type: 'info', message: 'No data found in this table.' });
                    setTimeout(() => setAlert(null), 3000);
                }
            } else {
                setData([]);
                setAlert({ type: 'error', message: result.message || 'No data found' });
                setTimeout(() => setAlert(null), 3000);
            }
        } catch (error: any) {
            setData([]);
            setAlert({ type: 'error', message: `Error: ${error.message}` });
            setTimeout(() => setAlert(null), 3000);
        } finally {
            setLoading(false);
        }
    }

    // Dynamic columns
    const columns: ColumnType<any>[] = data.length > 0
        ? Object.keys(data[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            align: 'center' as const,
        }))
        : [];

    // Test DB Connection
    const testConnection = async () => {
        try {
            const res = await axios.get('http://localhost:7080/api/db/test-connection');
            if (res.data.status === 'success') {
                setAlert({ type: 'success', message: 'Database connection successful!' });
                setTimeout(() => setAlert(null), 3000); // Auto-dismiss after 3 seconds
            } else {
                setAlert({ type: 'error', message: 'Database connection failed!' });
                setTimeout(() => setAlert(null), 3000); // Auto-dismiss after 3 seconds
            }
        } catch (err: any) {
            setAlert({ type: 'error', message: 'Database connection failed! Please check your settings.' });
            setTimeout(() => setAlert(null), 3000); // Auto-dismiss after 3 seconds
        }
    };

    return (
        <div>
            <h2 style={{ marginTop: 0 }}>Direct DB Query</h2>
            <Space style={{ marginBottom: 16 }}>
                <Select
                    style={{ width: 200 }}
                    placeholder="Select table"
                    value={selectedTable}
                    onChange={value => {
                        setSelectedTable(value);
                        setTableTouched(false); // Reset error when user selects
                    }}
                    loading={tableLoading}
                    allowClear
                    status={tableTouched && !selectedTable ? 'error' : ''}
                >
                    {tables.map((t) => (
                        <Option key={t} value={t}>
                            {t}
                        </Option>
                    ))}
                </Select>
                <Button
                    type="primary"
                    onClick={fetchDataOnce}
                    loading={loading}
                    disabled={!selectedTable} // Disable if no selection
                >
                    Query
                </Button>
                <Button type="dashed" onClick={testConnection}>
                    Test Connection
                </Button>
                <Button type="default" onClick={() => setData([])}>
                    Clear
                </Button>
            </Space>
            {alert && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    showIcon
                    closable
                    onClose={() => setAlert(null)}
                    style={{ marginBottom: 16 }}
                />
            )}
            {data.length > 0 ? (
                <Table
                    columns={columns}
                    dataSource={data.map((item, index) => ({ ...item, key: index }))}
                    pagination={{ pageSize: 20 }}
                    bordered
                    loading={loading}
                />
            ) : (
                <div style={{
                    minHeight: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999'
                }}>
                    Select a table and click "Query" to display data.
                </div>
            )}
        </div>
    );
};

export default DirectDBLookup;