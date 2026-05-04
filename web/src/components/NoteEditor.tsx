import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Space, Typography, message } from 'antd';
import { SaveOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getNoteByArticleId, saveNote, updateNote, deleteNote } from '../services/storage';
import { renderMarkdown } from '../utils/markdown';
import type { ArticleNote } from '../types';

const { Text } = Typography;
const { TextArea } = Input;

interface NoteEditorProps {
  articleId: string;
  articleTitle?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
}

export default function NoteEditor({ articleId, articleTitle, defaultCollapsed = false }: NoteEditorProps) {
  const [note, setNote] = useState<ArticleNote | null>(null);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadNote();
  }, [articleId]);

  async function loadNote() {
    const n = await getNoteByArticleId(articleId);
    if (n) {
      setNote(n);
      setContent(n.content);
    }
  }

  const autoSave = useCallback(async (newContent: string) => {
    if (!newContent.trim()) return;
    setIsSaving(true);
    try {
      if (note) {
        const updated = await updateNote({ ...note, content: newContent });
        setNote(updated);
      } else {
        const created = await saveNote({ articleId, content: newContent });
        setNote(created);
      }
    } finally {
      setIsSaving(false);
    }
  }, [note, articleId]);

  function handleContentChange(val: string) {
    setContent(val);
    // Auto-save after 1 second of no typing
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => autoSave(val), 1000);
  }

  async function handleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (!content.trim()) {
      message.warning('笔记内容不能为空');
      return;
    }
    setIsSaving(true);
    try {
      if (note) {
        const updated = await updateNote({ ...note, content });
        setNote(updated);
      } else {
        const created = await saveNote({ articleId, content });
        setNote(created);
      }
      message.success('笔记已保存');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    await deleteNote(note.id);
    setNote(null);
    setContent('');
    setIsEditing(false);
    message.success('笔记已删除');
  }

  if (collapsed && !isEditing && note) {
    // Collapsed view - show preview only
    return (
      <div style={{ padding: '8px 0' }}>
        <Button 
          type="text" 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => { setCollapsed(false); setIsEditing(true); }}
        >
          查看笔记 ({note.content.length} 字)
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Space>
          <Text strong>📝 笔记</Text>
          {articleTitle && <Text type="secondary">— {articleTitle}</Text>}
        </Space>
        <Space>
          {note && (
            <Button size="small" type="text" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? '编辑' : '预览'}
            </Button>
          )}
          {note && (
            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={handleDelete} />
          )}
          <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={isSaving}>
            保存
          </Button>
        </Space>
      </div>

      {showPreview && note ? (
        <div 
          style={{ 
            padding: 12, 
            background: '#f5f5f5', 
            borderRadius: 6,
            minHeight: 80,
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
        />
      ) : (
        <TextArea
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="写下你的笔记... 支持 Markdown：**粗体**、*斜体*、`代码`、# 标题"
          rows={4}
          onFocus={() => setIsEditing(true)}
        />
      )}

      {isSaving && <Text type="secondary" style={{ fontSize: 11 }}>自动保存中...</Text>}
      {note && !isSaving && <Text type="secondary" style={{ fontSize: 11 }}>已保存 · {new Date(note.updatedAt).toLocaleString('zh-CN')}</Text>}
    </div>
  );
}