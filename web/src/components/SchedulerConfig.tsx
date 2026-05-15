// Scheduler Config - Cron expression editor, quiet hours, batch settings
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Select, Input, Switch, TimePicker, Space, Typography, Button, Divider, Tag, Alert } from 'antd';
import { ClockCircleOutlined, MoonOutlined, BatchOutlined, SaveOutlined } from '@ant-design/icons';
import { 
  PRESET_SCHEDULES, 
  DEFAULT_QUIET_HOURS, 
  DEFAULT_BATCH_CONFIG,
  type CronConfig,
  type QuietHours,
  type BatchConfig 
} from '../services/scheduler/types';
import { validateCron, nextRunTime, formatNextRun } from '../services/scheduler/cron-parser';
import { formatQuietHoursRange } from '../services/scheduler/quiet-hours';
import { getSchedulerService } from '../services/scheduler/scheduler';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SchedulerConfig: React.FC<Props> = ({ isOpen, onClose }) => {
  const [jobs, setJobs] = useState<CronConfig[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [batchConfig, setBatchConfig] = useState<BatchConfig>(DEFAULT_BATCH_CONFIG);
  const [customCron, setCustomCron] = useState('');
  const [cronError, setCronError] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);

  const loadState = useCallback(() => {
    const scheduler = getSchedulerService();
    setJobs(scheduler.listJobs());
    
    try {
      const stored = localStorage.getItem('ai-quiet-hours');
      if (stored) setQuietHours(JSON.parse(stored));
    } catch {}
    
    try {
      const stored = localStorage.getItem('ai-batch-config');
      if (stored) setBatchConfig(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) loadState();
  }, [isOpen, loadState]);

  const handlePresetSelect = (expression: string) => {
    setCustomCron(expression);
    validateAndShowNext(expression);
  };

  const handleCustomCronChange = (value: string) => {
    setCustomCron(value);
    validateAndShowNext(value);
  };

  const validateAndShowNext = (expr: string) => {
    const result = validateCron(expr);
    if (result.valid) {
      setCronError(null);
      const next = nextRunTime(expr);
      setNextRun(next ? formatNextRun(next) : null);
    } else {
      setCronError(result.error || 'Invalid expression');
      setNextRun(null);
    }
  };

  const handleAddJob = () => {
    if (!customCron || cronError) return;
    
    const scheduler = getSchedulerService();
    const job: CronConfig = {
      id: `job-${Date.now()}`,
      expression: customCron,
      label: `Job ${scheduler.listJobs().length + 1}`,
      enabled: true,
    };
    
    scheduler.addJob(job);
    setJobs(scheduler.listJobs());
    setCustomCron('');
    setNextRun(null);
  };

  const handleToggleJob = (id: string, enabled: boolean) => {
    const scheduler = getSchedulerService();
    scheduler.updateJob(id, { enabled });
    setJobs(scheduler.listJobs());
  };

  const handleDeleteJob = (id: string) => {
    const scheduler = getSchedulerService();
    scheduler.removeJob(id);
    setJobs(scheduler.listJobs());
  };

  const handleSaveQuietHours = () => {
    localStorage.setItem('ai-quiet-hours', JSON.stringify(quietHours));
  };

  const handleSaveBatchConfig = () => {
    localStorage.setItem('ai-batch-config', JSON.stringify(batchConfig));
  };

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <ClockCircleOutlined />
        <Text strong>Scheduler Configuration</Text>
      </Space>

      {/* Schedule Jobs */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Paragraph strong>Scheduled Jobs</Paragraph>
        
        <Form layout="vertical">
          <Form.Item label="Preset Schedules">
            <Select
              placeholder="Select a preset or enter custom"
              onChange={handlePresetSelect}
              options={PRESET_SCHEDULES.map(p => ({ value: p.expression, label: p.label }))}
            />
          </Form.Item>
          
          <Form.Item label="Custom Cron Expression">
            <TextArea
              placeholder="* * * * * (minute hour day month weekday)"
              value={customCron}
              onChange={e => handleCustomCronChange(e.target.value)}
              status={cronError ? 'error' : undefined}
              rows={1}
              style={{ fontFamily: 'monospace' }}
            />
            {cronError && <Text type="danger">{cronError}</Text>}
            {nextRun && <Text type="secondary">Next run: {nextRun}</Text>}
          </Form.Item>
          
          <Button 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleAddJob}
            disabled={!customCron || !!cronError}
          >
            Add Job
          </Button>
        </Form>

        <Divider />

        {jobs.length === 0 ? (
          <Text type="secondary">No scheduled jobs</Text>
        ) : (
          jobs.map(job => (
            <Card key={job.id} size="small" style={{ marginTop: 8 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space direction="vertical" size={0}>
                  <Text code>{job.expression}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {job.label} · Next: {job.nextRun ? formatNextRun(new Date(job.nextRun)) : 'N/A'}
                  </Text>
                </Space>
                <Space>
                  <Switch 
                    size="small" 
                    checked={job.enabled}
                    onChange={enabled => handleToggleJob(job.id, enabled)}
                  />
                  <Button 
                    type="link" 
                    size="small" 
                    danger
                    onClick={() => handleDeleteJob(job.id)}
                  >
                    Delete
                  </Button>
                </Space>
              </Space>
            </Card>
          ))
        )}
      </Card>

      {/* Quiet Hours */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          <MoonOutlined />
          <Paragraph strong style={{ margin: 0 }}>Quiet Hours</Paragraph>
        </Space>
        
        <Form layout="vertical">
          <Form.Item>
            <Space>
              <Text>Enable Quiet Hours</Text>
              <Switch 
                checked={quietHours.enabled}
                onChange={enabled => {
                  setQuietHours({ ...quietHours, enabled });
                  setTimeout(handleSaveQuietHours, 0);
                }}
              />
            </Space>
          </Form.Item>
          
          {quietHours.enabled && (
            <>
              <Form.Item label="Start Time">
                <TimePicker
                  value={null}
                  format="HH:mm"
                  placeholder={quietHours.startTime}
                  onChange={(time, str) => {
                    if (str) {
                      setQuietHours({ ...quietHours, startTime: str });
                      setTimeout(handleSaveQuietHours, 0);
                    }
                  }}
                />
              </Form.Item>
              
              <Form.Item label="End Time">
                <TimePicker
                  value={null}
                  format="HH:mm"
                  placeholder={quietHours.endTime}
                  onChange={(time, str) => {
                    if (str) {
                      setQuietHours({ ...quietHours, endTime: str });
                      setTimeout(handleSaveQuietHours, 0);
                    }
                  }}
                />
              </Form.Item>
              
              <Form.Item>
                <Space>
                  <Text>Weekdays Only</Text>
                  <Switch 
                    checked={quietHours.weekdaysOnly}
                    onChange={weekdaysOnly => {
                      setQuietHours({ ...quietHours, weekdaysOnly });
                      setTimeout(handleSaveQuietHours, 0);
                    }}
                  />
                </Space>
              </Form.Item>
              
              <Tag color="blue">{formatQuietHoursRange(quietHours)}</Tag>
            </>
          )}
        </Form>
      </Card>

      {/* Batch Config */}
      <Card size="small">
        <Space style={{ marginBottom: 12 }}>
          <BatchOutlined />
          <Paragraph strong style={{ margin: 0 }}>Batch Processing</Paragraph>
        </Space>
        
        <Form layout="vertical">
          <Form.Item>
            <Space>
              <Text>Enable Batch Mode</Text>
              <Switch 
                checked={batchConfig.enabled}
                onChange={enabled => {
                  setBatchConfig({ ...batchConfig, enabled });
                  setTimeout(handleSaveBatchConfig, 0);
                }}
              />
            </Space>
          </Form.Item>
          
          {batchConfig.enabled && (
            <>
              <Form.Item label="Threshold (articles)">
                <Input
                  type="number"
                  value={batchConfig.threshold}
                  onChange={e => {
                    setBatchConfig({ ...batchConfig, threshold: parseInt(e.target.value) || 5 });
                    setTimeout(handleSaveBatchConfig, 0);
                  }}
                  min={1}
                />
              </Form.Item>
              
              <Form.Item label="Max Batch Size">
                <Input
                  type="number"
                  value={batchConfig.maxBatchSize}
                  onChange={e => {
                    setBatchConfig({ ...batchConfig, maxBatchSize: parseInt(e.target.value) || 20 });
                    setTimeout(handleSaveBatchConfig, 0);
                  }}
                  min={1}
                />
              </Form.Item>
              
              <Form.Item label="Summary Length (sentences)">
                <Input
                  type="number"
                  value={batchConfig.batchSummaryLength}
                  onChange={e => {
                    setBatchConfig({ ...batchConfig, batchSummaryLength: parseInt(e.target.value) || 3 });
                    setTimeout(handleSaveBatchConfig, 0);
                  }}
                  min={1}
                  max={10}
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
};

export default SchedulerConfig;
