// Plugin Upload Panel - UI for uploading and publishing plugins
import React, { useState, useCallback } from 'react';
import {
  Card,
  Button,
  Upload,
  Input,
  Form,
  message,
  Space,
  Typography,
  Divider,
  Steps,
  Alert,
  Tag,
} from 'antd';
import {
  CloudUploadOutlined,
  CheckCircleOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface PluginUploadPanelProps {
  /** Backend API URL (optional, defaults to frontend-only mode) */
  apiUrl?: string;
  /** API Key for authenticated uploads */
  apiKey?: string;
  /** Callback when upload succeeds */
  onUploadSuccess?: (pluginId: string) => void;
}

interface UploadFormData {
  namespace: string;
  name: string;
  author: string;
  description: string;
  homepage?: string;
  version: string;
  changelog?: string;
}

export const PluginUploadPanel: React.FC<PluginUploadPanelProps> = ({
  apiUrl = '/api',
  apiKey,
  onUploadSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<UploadFormData>();
  const [manifestData, setManifestData] = useState<any>(null);

  // Step 1: Upload zip file
  const handleFileUpload: UploadProps['onChange'] = useCallback((info) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      setUploadedFile(file as File);
      const reader = new FileReader();
      reader.onload = () => {
        // In a real implementation, we'd parse the zip
      };
      setCurrentStep(1);
    }
  }, []);

  // Step 2: Fill manifest info
  const handleManifestSubmit = async (values: UploadFormData) => {
    setManifestData(values);
    setCurrentStep(2);
  };

  // Step 3: Review and submit
  const handleFinalSubmit = async () => {
    if (!manifestData) {
      message.error('Please complete all steps');
      return;
    }

    if (!apiKey) {
      message.warning('API key required for upload. Please configure your API key.');
      return;
    }

    setLoading(true);
    try {
      // Create plugin via API
      const createResponse = await fetch(`${apiUrl}/plugins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          namespace: manifestData.namespace,
          name: manifestData.name,
          author: manifestData.author,
          description: manifestData.description,
          homepage: manifestData.homepage,
          manifest: {
            name: manifestData.name,
            version: manifestData.version,
            author: manifestData.author,
            description: manifestData.description,
            homepage: manifestData.homepage,
          },
        }),
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create plugin: ${createResponse.statusText}`);
      }

      const plugin = await createResponse.json();
      
      // Upload zip file if present
      if (uploadedFile) {
        const zipFormData = new FormData();
        zipFormData.append('zipFile', uploadedFile);
        zipFormData.append('pluginId', plugin.id);
        zipFormData.append('version', manifestData.version);
        zipFormData.append('changelog', manifestData.changelog || '');

        const uploadResponse = await fetch(`${apiUrl}/upload`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
          },
          body: zipFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload zip: ${uploadResponse.statusText}`);
        }
      }

      // Submit for review
      const reviewResponse = await fetch(`${apiUrl}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ pluginId: plugin.id }),
      });

      if (!reviewResponse.ok) {
        throw new Error(`Failed to submit for review: ${reviewResponse.statusText}`);
      }

      message.success('Plugin uploaded and submitted for review!');
      setCurrentStep(3);
      onUploadSuccess?.(plugin.id);
    } catch (error) {
      console.error('Upload failed:', error);
      message.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.zip',
    beforeUpload: () => false,
    onChange: handleFileUpload,
    showUploadList: false,
  };

  return (
    <Card className="plugin-upload-panel" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Title level={4}>
        <CloudUploadOutlined /> Upload Plugin
      </Title>
      
      <Steps
        current={currentStep}
        items={[
          { title: 'Upload', description: 'Upload plugin package' },
          { title: 'Manifest', description: 'Fill plugin info' },
          { title: 'Review', description: 'Confirm and submit' },
          { title: 'Done', description: 'Awaiting review' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {currentStep === 0 && (
        <div>
          <Upload.Dragger {...uploadProps} style={{ padding: 24 }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag plugin ZIP file to upload</p>
            <p className="ant-upload-hint">
              Plugin must include manifest.json and signature
            </p>
          </Upload.Dragger>
          
          <Divider>or</Divider>
          
          <Alert
            message="Frontend-only mode"
            description="Without a backend server, you can still create a plugin manifest for local testing."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Button onClick={() => setCurrentStep(1)}>
            Continue without upload
          </Button>
        </div>
      )}

      {currentStep === 1 && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleManifestSubmit}
          initialValues={{ namespace: 'local', author: '' }}
        >
          <Form.Item
            label="Namespace"
            name="namespace"
            rules={[{ required: true, message: 'Namespace is required' }]}
          >
            <Input placeholder="e.g., my-company" />
          </Form.Item>
          
          <Form.Item
            label="Plugin Name"
            name="name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g., my-plugin" />
          </Form.Item>
          
          <Form.Item
            label="Version"
            name="version"
            rules={[{ required: true, message: 'Version is required' }]}
          >
            <Input placeholder="e.g., 1.0.0" />
          </Form.Item>
          
          <Form.Item
            label="Author"
            name="author"
            rules={[{ required: true, message: 'Author is required' }]}
          >
            <Input placeholder="Your name or organization" />
          </Form.Item>
          
          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Description is required' }]}
          >
            <TextArea rows={3} placeholder="Describe your plugin..." />
          </Form.Item>
          
          <Form.Item label="Homepage (optional)" name="homepage">
            <Input placeholder="https://example.com" />
          </Form.Item>
          
          <Space>
            <Button onClick={() => setCurrentStep(0)}>Back</Button>
            <Button type="primary" htmlType="submit">
              Continue to Review
            </Button>
          </Space>
        </Form>
      )}

      {currentStep === 2 && manifestData && (
        <div>
          <Alert
            message="Review Your Plugin"
            description="Please verify the information below before submitting for review."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Plugin ID:</Text> <Tag>{manifestData.namespace}/{manifestData.name}</Tag>
              </div>
              <div>
                <Text strong>Version:</Text> {manifestData.version}
              </div>
              <div>
                <Text strong>Author:</Text> {manifestData.author}
              </div>
              <div>
                <Text strong>Description:</Text>
                <Paragraph type="secondary" style={{ marginTop: 4 }}>
                  {manifestData.description}
                </Paragraph>
              </div>
              {uploadedFile && (
                <div>
                  <Text strong>Package:</Text> {uploadedFile.name}
                </div>
              )}
            </Space>
          </Card>
          
          <Form.Item label="Changelog (optional)" name="changelog">
            <TextArea rows={2} placeholder="What is new in this version..." />
          </Form.Item>
          
          <Space>
            <Button onClick={() => setCurrentStep(1)}>Back</Button>
            <Button
              type="primary"
              onClick={handleFinalSubmit}
              loading={loading}
              icon={<SafetyCertificateOutlined />}
            >
              Submit for Review
            </Button>
          </Space>
        </div>
      )}

      {currentStep === 3 && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <Title level={4}>Plugin Submitted!</Title>
          <Paragraph type="secondary">
            Your plugin has been submitted for review. You will be notified once it is approved.
          </Paragraph>
          <Divider />
          <Text type="secondary" style={{ fontSize: 12 }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} /> Pending Review
          </Text>
        </div>
      )}
    </Card>
  );
};

export default PluginUploadPanel;