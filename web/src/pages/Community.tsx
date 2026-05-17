/**
 * Community Page - Public subscription lists, sharing, and user profiles
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Card, List, Avatar, Button, Space, Tag, Input, Empty, 
  Modal, Form, message, Tabs, Select, Typography, Tooltip, Popconfirm,
  Row, Col, Statistic
} from 'antd';
import {
  UserOutlined, TeamOutlined, ShareAltOutlined, PlusOutlined,
  SearchOutlined, StarOutlined, HeartOutlined, CommentOutlined,
  CopyOutlined, CheckOutlined, EditOutlined, DeleteOutlined,
  GlobalOutlined, LinkOutlined
} from '@ant-design/icons';
import { I18nContext, useTranslation } from '../i18n';
import * as communityDB from '../db/communityDB';
import * as publicListDB from '../db/publicListDB';
import type { LocalUserProfile, PublicListWithAuthor, Follow } from '../types/community';
import type { PublicList, FeedInfo } from '../types/publicList';
import { createLocalUserProfile, generateUserId } from '../types/community';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Mock public data for demo (in production, this would come from a server)
const MOCK_PUBLIC_LISTS: Array<PublicListWithAuthor & { stats: { subscriberCount: number; viewCount: number } }> = [
  {
    id: 'pl_demo1',
    name: 'AI 前沿技术',
    description: '汇集大模型、机器学习、深度学习相关的最新资讯和论文解读',
    feedIds: ['feed1', 'feed2', 'feed3'],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 2,
    author: {
      id: 'user_demo1',
      username: 'ai_researcher',
      displayName: 'AI研究员',
      bio: '专注人工智能技术研究，分享最新AI动态',
      createdAt: Date.now() - 86400000 * 180,
      publicListCount: 5,
      followerCount: 1234,
      followingCount: 89,
    },
    stats: { subscriberCount: 567, viewCount: 8901 },
  },
  {
    id: 'pl_demo2',
    name: '前端技术精选',
    description: 'React、Vue、TypeScript 等前端技术优质文章精选',
    feedIds: ['feed4', 'feed5'],
    createdAt: Date.now() - 86400000 * 45,
    updatedAt: Date.now() - 86400000 * 1,
    author: {
      id: 'user_demo2',
      username: 'frontend_dev',
      displayName: '前端开发者',
      bio: '全栈开发，热爱开源，分享前端技术栈',
      createdAt: Date.now() - 86400000 * 365,
      publicListCount: 12,
      followerCount: 3456,
      followingCount: 234,
    },
    stats: { subscriberCount: 892, viewCount: 15670 },
  },
  {
    id: 'pl_demo3',
    name: '科技创投日报',
    description: '每日科技行业创业投资动态，帮你把握行业趋势',
    feedIds: ['feed6', 'feed7', 'feed8'],
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 0,
    author: {
      id: 'user_demo3',
      username: 'vc_analyst',
      displayName: '投资分析师',
      bio: '关注科技领域的早期投资机会',
      createdAt: Date.now() - 86400000 * 500,
      publicListCount: 8,
      followerCount: 2156,
      followingCount: 167,
    },
    stats: { subscriberCount: 1234, viewCount: 23456 },
  },
];

const MOCK_FEEDS: FeedInfo[] = [
  { id: 'feed1', title: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { id: 'feed2', title: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
  { id: 'feed3', title: 'ArXiv CS.AI', url: 'https://rss.arxiv.org/rss/cs.AI' },
  { id: 'feed4', title: 'React Blog', url: 'https://reactjs.org/blog/rss.xml' },
  { id: 'feed5', title: 'Vue Blog', url: 'https://blog.vuejs.org/posts/feed.xml' },
  { id: 'feed6', title: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { id: 'feed7', title: 'VentureBeat', url: 'https://venturebeat.com/category/ai/feed/' },
  { id: 'feed8', title: 'Bloomberg Tech', url: 'https://feeds.bloomberg.com/technology/news.rss' },
];

export const CommunityPage: React.FC = () => {
  const { t } = React.useContext(I18nContext);
  const [localProfile, setLocalProfile] = useState<LocalUserProfile | null>(null);
  const [myLists, setMyLists] = useState<PublicList[]>([]);
  const [publicLists, setPublicLists] = useState<typeof MOCK_PUBLIC_LISTS>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explore');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editProfile] = Form.useForm();
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<PublicList | null>(null);
  const [createListForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Load local user profile and lists
  const loadData = useCallback(async () => {
    try {
      const profile = await communityDB.getLocalProfile();
      setLocalProfile(profile);

      const lists = await publicListDB.getAllPublicLists();
      setMyLists(lists);

      // Load mock public lists (in production, fetch from server)
      setPublicLists(MOCK_PUBLIC_LISTS);
    } catch (err) {
      console.error('Failed to load community data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle create profile
  const handleCreateProfile = async (values: { username: string; displayName: string; bio?: string }) => {
    try {
      const newProfile = createLocalUserProfile({
        username: values.username,
        displayName: values.displayName,
        bio: values.bio,
      });
      await communityDB.saveLocalProfile(newProfile);
      setLocalProfile(newProfile);
      setProfileModalOpen(false);
      message.success('个人资料已创建');
    } catch (err) {
      message.error('创建失败');
    }
  };

  // Handle update profile
  const handleUpdateProfile = async (values: { displayName: string; bio?: string }) => {
    if (!localProfile) return;
    try {
      const updated = { ...localProfile, ...values };
      await communityDB.saveLocalProfile(updated);
      setLocalProfile(updated);
      setProfileModalOpen(false);
      message.success('个人资料已更新');
    } catch (err) {
      message.error('更新失败');
    }
  };

  // Handle create public list
  const handleCreateList = async (values: { name: string; description: string; feedIds: string[] }) => {
    setLoading(true);
    try {
      const newList: PublicList = {
        id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: values.name,
        description: values.description || '',
        feedIds: values.feedIds || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await publicListDB.savePublicList(newList);
      await loadData();
      setCreateListModalOpen(false);
      createListForm.resetFields();
      message.success('公开列表已创建');
    } catch (err) {
      message.error('创建失败');
    } finally {
      setLoading(false);
    }
  };

  // Handle update public list
  const handleUpdateList = async (values: { name: string; description: string; feedIds: string[] }) => {
    if (!editingList) return;
    setLoading(true);
    try {
      await publicListDB.updatePublicList(editingList.id, {
        name: values.name,
        description: values.description,
        feedIds: values.feedIds,
      });
      await loadData();
      setEditingList(null);
      createListForm.resetFields();
      message.success('公开列表已更新');
    } catch (err) {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete public list
  const handleDeleteList = async (listId: string) => {
    try {
      await publicListDB.deletePublicList(listId);
      await loadData();
      message.success('已删除');
    } catch (err) {
      message.error('删除失败');
    }
  };

  // Handle subscribe (mock)
  const handleSubscribe = (listId: string) => {
    message.success('已订阅');
  };

  // Handle copy share link
  const handleCopyLink = (listId: string) => {
    const link = `${window.location.origin}/public/${listId}`;
    navigator.clipboard.writeText(link).then(() => {
      message.success('链接已复制');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // Filter public lists by search
  const filteredLists = publicLists.filter(list => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      list.name.toLowerCase().includes(q) ||
      list.description.toLowerCase().includes(q) ||
      list.author.displayName.toLowerCase().includes(q)
    );
  });

  // Render list card
  const renderListCard = (list: typeof MOCK_PUBLIC_LISTS[0], showActions = true) => (
    <Card
      key={list.id}
      size="small"
      style={{ marginBottom: 12 }}
      actions={showActions ? [
        <Tooltip key="subscribe" title="订阅">
          <Button type="text" icon={<HeartOutlined />} onClick={() => handleSubscribe(list.id)}>
            {list.stats.subscriberCount}
          </Button>
        </Tooltip>,
        <Tooltip key="share" title="分享">
          <Button type="text" icon={<ShareAltOutlined />} onClick={() => handleCopyLink(list.id)} />
        </Tooltip>,
        <Tooltip key="comments" title="评论">
          <Button type="text" icon={<CommentOutlined />}>0</Button>
        </Tooltip>,
      ] : undefined}
    >
      <Card.Meta
        avatar={<Avatar icon={<UserOutlined />} src={list.author.avatar} />}
        title={
          <Space>
            <span>{list.name}</span>
            <Tag color="blue" icon={<GlobalOutlined />}>公开</Tag>
          </Space>
        }
        description={
          <div>
            <Space>
              <Text type="secondary">@{list.author.username}</Text>
              <Text type="secondary">•</Text>
              <Text type="secondary">
                {Math.floor((Date.now() - list.updatedAt) / 86400000)} 天前更新
              </Text>
            </Space>
            <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginTop: 8, marginBottom: 0 }}>
              {list.description}
            </Paragraph>
            <Space style={{ marginTop: 8 }}>
              <Tag>{list.feedIds.length} 个订阅源</Tag>
              <Text type="secondary"><TeamOutlined /> {list.stats.subscriberCount} 订阅</Text>
              <Text type="secondary">👁 {list.stats.viewCount} 浏览</Text>
            </Space>
          </div>
        }
      />
    </Card>
  );

  return (
    <Content style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 16 }}>
          <TeamOutlined /> {t('community.title', '社区')}
        </Title>
        
        {!localProfile ? (
          <Card>
            <Empty description="创建个人资料以参与社区讨论">
              <Button type="primary" onClick={() => setProfileModalOpen(true)}>
                {t('community.createProfile', '创建个人资料')}
              </Button>
            </Empty>
          </Card>
        ) : (
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space>
              <Avatar size="large" icon={<UserOutlined />} src={localProfile.avatar} />
              <div>
                <Text strong>{localProfile.displayName}</Text>
                <br />
                <Text type="secondary">@{localProfile.username}</Text>
              </div>
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => {
                  editProfile.setFieldsValue({
                    displayName: localProfile.displayName,
                    bio: localProfile.bio,
                  });
                  setProfileModalOpen(true);
                }}
              >
                编辑资料
              </Button>
            </Space>
          </Card>
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={t('community.explore', '发现')} key="explore">
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder={t('community.searchPlaceholder', '搜索公开列表或用户...')}
                prefix={<SearchOutlined />}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                allowClear
              />
            </div>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                {filteredLists.length > 0 ? (
                  filteredLists.map(list => renderListCard(list))
                ) : (
                  <Empty description="暂无公开列表" />
                )}
              </Col>
              <Col xs={24} lg={8}>
                <Card title="推荐用户" size="small">
                  {MOCK_PUBLIC_LISTS.slice(0, 3).map(list => (
                    <div key={list.author.id} style={{ marginBottom: 12 }}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} />
                        <div>
                          <Text strong style={{ fontSize: 12 }}>{list.author.displayName}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11 }}>@{list.author.username}</Text>
                        </div>
                        <Button size="small" type="link">关注</Button>
                      </Space>
                    </div>
                  ))}
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={t('community.myLists', '我的列表')} key="myLists">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => {
                  setEditingList(null);
                  createListForm.resetFields();
                  setCreateListModalOpen(true);
                }}
              >
                {t('community.createList', '创建公开列表')}
              </Button>
            </div>

            {myLists.length > 0 ? (
              <List
                dataSource={myLists}
                renderItem={(list) => (
                  <List.Item
                    actions={[
                      <Button 
                        key="edit" 
                        type="link" 
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingList(list);
                          createListForm.setFieldsValue({
                            name: list.name,
                            description: list.description,
                            feedIds: list.feedIds,
                          });
                          setCreateListModalOpen(true);
                        }}
                      >
                        编辑
                      </Button>,
                      <Button 
                        key="share" 
                        type="link" 
                        icon={<ShareAltOutlined />}
                        onClick={() => handleCopyLink(list.id)}
                      >
                        分享
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="确认删除？"
                        onConfirm={() => handleDeleteList(list.id)}
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={list.name}
                      description={
                        <Space>
                          <Tag>{list.feedIds.length} 个订阅源</Tag>
                          <Text type="secondary">
                            更新于 {new Date(list.updatedAt).toLocaleDateString('zh-CN')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="你还没有创建任何公开列表" />
            )}
          </TabPane>

          <TabPane tab={t('community.subscriptions', '我的订阅')} key="subscriptions">
            <Card size="small">
              <Empty description="订阅感兴趣的公开列表，获取最新更新">
                <Button type="primary" onClick={() => setActiveTab('explore')}>
                  {t('community.explore', '发现')}
                </Button>
              </Empty>
            </Card>
          </TabPane>
        </Tabs>
      </div>

      {/* Create/Edit Profile Modal */}
      <Modal
        title={localProfile ? '编辑个人资料' : '创建个人资料'}
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        footer={null}
      >
        <Form
          form={editProfile}
          layout="vertical"
          onFinish={localProfile ? handleUpdateProfile : handleCreateProfile}
          initialValues={{
            username: localProfile?.username || '',
            displayName: localProfile?.displayName || '',
            bio: localProfile?.bio || '',
          }}
        >
          {!localProfile && (
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="用于个人主页URL" />
            </Form.Item>
          )}
          <Form.Item
            label="显示名称"
            name="displayName"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="别人看到的名字" />
          </Form.Item>
          <Form.Item label="个人简介" name="bio">
            <Input.TextArea placeholder="简单介绍一下自己（可选）" rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit">
                {localProfile ? '保存' : '创建'}
              </Button>
              <Button onClick={() => setProfileModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create/Edit List Modal */}
      <Modal
        title={editingList ? '编辑公开列表' : '创建公开列表'}
        open={createListModalOpen}
        onCancel={() => {
          setCreateListModalOpen(false);
          setEditingList(null);
          createListForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createListForm}
          layout="vertical"
          onFinish={editingList ? handleUpdateList : handleCreateList}
          initialValues={{
            name: '',
            description: '',
            feedIds: [],
          }}
        >
          <Form.Item
            label="列表名称"
            name="name"
            rules={[{ required: true, message: '请输入列表名称' }]}
          >
            <Input placeholder="如：AI技术资讯精选" />
          </Form.Item>
          <Form.Item
            label="列表描述"
            name="description"
          >
            <Input.TextArea placeholder="描述这个列表的内容和用途（可选）" rows={3} />
          </Form.Item>
          <Form.Item
            label="选择订阅源"
            name="feedIds"
            extra="选择要包含在此公开列表中的订阅源"
          >
            <Select
              mode="multiple"
              placeholder="选择订阅源"
              options={MOCK_FEEDS.map(f => ({ label: f.title, value: f.id }))}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingList ? '保存' : '创建'}
              </Button>
              <Button onClick={() => {
                setCreateListModalOpen(false);
                setEditingList(null);
                createListForm.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Content>
  );
};

export default CommunityPage;