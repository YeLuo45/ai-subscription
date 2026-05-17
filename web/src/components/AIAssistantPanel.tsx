// AI Assistant Panel - Chat interface for natural language subscription management
import React, { useState, useEffect, useRef } from 'react';
import { 
  Drawer, 
  Input, 
  Button, 
  List, 
  Avatar, 
  Space, 
  Typography,
  Dropdown,
  Modal,
} from 'antd';
import {
  SendOutlined,
  ClearOutlined,
  RobotOutlined,
  UserOutlined,
  MoreOutlined,
  CommentOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { processUserMessage, type ChatMessage, type ChatSession, loadChatHistory, saveChatHistory, createNewSession, addMessageToSession, clearSession } from '../../services/chatService';
import { getModels } from '../../services/storage';
import type { AIModel } from '../../types';
import { useContext } from 'react';
import { I18nContext } from '../../i18n';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface AIAssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ open, onClose }) => {
  const { t } = useContext(I18nContext);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load chat history on mount
  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setSessions(history);
      // Use the most recent session
      const latest = history[history.length - 1];
      setCurrentSession(latest);
    } else {
      const newSession = createNewSession();
      setSessions([newSession]);
      setCurrentSession(newSession);
    }
    
    // Load AI model
    getModels().then(models => {
      const defaultModel = models.find(m => m.isDefault) || models[0];
      setCurrentModel(defaultModel || null);
    });
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);
  
  // Persist sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      saveChatHistory(sessions);
    }
  }, [sessions]);
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentSession) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to session
    let updatedSession = addMessageToSession(currentSession, 'user', userMessage);
    setCurrentSession(updatedSession);
    
    // Update sessions
    setSessions(prev => {
      const newSessions = [...prev];
      const idx = newSessions.findIndex(s => s.id === currentSession.id);
      if (idx >= 0) {
        newSessions[idx] = updatedSession;
      }
      return newSessions;
    });
    
    setIsLoading(true);
    
    try {
      const { content, isLoading: loading } = await processUserMessage(userMessage, currentModel);
      
      // Add assistant response
      updatedSession = addMessageToSession(updatedSession, 'assistant', content);
      setCurrentSession(updatedSession);
      
      setSessions(prev => {
        const newSessions = [...prev];
        const idx = newSessions.findIndex(s => s.id === currentSession.id);
        if (idx >= 0) {
          newSessions[idx] = updatedSession;
        }
        return newSessions;
      });
    } catch (error) {
      console.error('[AIAssistantPanel] Error processing message:', error);
      const errorMsg = '抱歉，处理消息时出现错误。';
      updatedSession = addMessageToSession(updatedSession, 'assistant', errorMsg);
      setCurrentSession(updatedSession);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearHistory = () => {
    if (!currentSession) return;
    
    Modal.confirm({
      title: '确认清除对话历史',
      content: '确定要清除当前对话历史吗？此操作不可撤销。',
      okText: '确认清除',
      cancelText: '取消',
      onOk: () => {
        const cleared = clearSession(currentSession);
        setCurrentSession(cleared);
        setSessions(prev => {
          const newSessions = [...prev];
          const idx = newSessions.findIndex(s => s.id === currentSession.id);
          if (idx >= 0) {
            newSessions[idx] = cleared;
          }
          return newSessions;
        });
      },
    });
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleNewSession = () => {
    const newSession = createNewSession();
    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
  };
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 16,
        }}
      >
        {!isUser && (
          <Avatar
            icon={<RobotOutlined />}
            style={{ marginRight: 8, backgroundColor: '#1890ff' }}
            size="small"
          />
        )}
        <div
          style={{
            maxWidth: '70%',
            padding: '10px 14px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            backgroundColor: isUser ? '#1890ff' : '#f0f0f0',
            color: isUser ? '#fff' : 'inherit',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
          <div
            style={{
              fontSize: 10,
              opacity: 0.7,
              marginTop: 4,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {formatTime(message.timestamp)}
          </div>
        </div>
        {isUser && (
          <Avatar
            icon={<UserOutlined />}
            style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
            size="small"
          />
        )}
      </div>
    );
  };
  
  const menuItems: MenuProps['items'] = [
    {
      key: 'new',
      label: '新建对话',
      onClick: handleNewSession,
    },
    {
      key: 'clear',
      label: '清除当前对话',
      onClick: handleClearHistory,
    },
  ];
  
  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined />
          <span>AI 订阅助手</span>
        </Space>
      }
      placement="right"
      width={420}
      onClose={onClose}
      open={open}
      extra={
        <Dropdown menu={{ items: menuItems }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          marginTop: -12,
        }}
      >
        {/* Messages Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 0',
          }}
        >
          {(!currentSession || currentSession.messages.length === 0) ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#999',
              }}
            >
              <CommentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <div>
                <Text type="secondary">我是您的智能订阅助手</Text>
              </div>
              <div style={{ marginTop: 16, fontSize: 13 }}>
                <div>我可以帮您：</div>
                <div style={{ marginTop: 8 }}>
                  📊 查询订阅统计<br/>
                  📰 推荐相关内容<br/>
                  📝 生成文章摘要
                </div>
              </div>
            </div>
          ) : (
            currentSession.messages.map(renderMessage)
          )}
          
          {isLoading && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 16,
              }}
            >
              <Avatar
                icon={<RobotOutlined />}
                style={{ marginRight: 8, backgroundColor: '#1890ff' }}
                size="small"
              />
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 16,
                  backgroundColor: '#f0f0f0',
                }}
              >
                <Text type="secondary">思考中...</Text>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div
          style={{
            borderTop: '1px solid #f0f0f0',
            paddingTop: 12,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <TextArea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="问我任何关于订阅内容的问题..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={isLoading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                type="text"
                icon={<ClearOutlined />}
                onClick={handleClearHistory}
                size="small"
              >
                清除
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
              >
                发送
              </Button>
            </div>
          </Space>
          
          {!currentModel && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              💡 请在设置中配置 AI 模型以获得完整功能
            </Text>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default AIAssistantPanel;