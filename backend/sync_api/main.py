"""
ai-subscription Cloud Sync Backend
基于 thunderbolt PowerSync 架构 + nanobot MessageBus

FastAPI 后端服务，提供：
- REST API: 增量同步端点
- WebSocket: 实时同步通道
- SQLite: 本地存储 + 变更日志
- JWT: 客户端认证
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime, timedelta
import json
import asyncio
import uuid
import time
from contextlib import asynccontextmanager

import sqlite3
import jwt
from passlib.context import CryptContext

# ============ Configuration ============

DATABASE_PATH = "data/sync.db"
JWT_SECRET = "ai-subscription-sync-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# ============ Database Setup ============

def init_db():
    """Initialize SQLite database with sync tables."""
    import os
    os.makedirs("data", exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # 客户端表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            client_id TEXT PRIMARY KEY,
            client_type TEXT NOT NULL,  -- 'web', 'miniapp', 'pc', 'android'
            created_at INTEGER NOT NULL,
            last_sync_at INTEGER,
            token TEXT
        )
    """)
    
    # 订阅源表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            category TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted_at INTEGER,
            FOREIGN KEY (client_id) REFERENCES clients(client_id)
        )
    """)
    
    # 文章表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            subscription_id TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            url TEXT,
            author TEXT,
            published_at INTEGER,
            is_read INTEGER DEFAULT 0,
            is_bookmarked INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted_at INTEGER,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
        )
    """)
    
    # 变更日志表 (核心: 增量同步)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,  -- 'subscription', 'article', 'read_status'
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,    -- 'create', 'update', 'delete'
            payload TEXT NOT NULL,       -- JSON
            timestamp INTEGER NOT NULL,
            vector_clock INTEGER DEFAULT 0,
            synced_at INTEGER
        )
    """)
    
    # 向量时钟表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vector_clocks (
            client_id TEXT PRIMARY KEY,
            clock INTEGER DEFAULT 0
        )
    """)
    
    # 索引
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sync_log_client ON sync_log(client_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_articles_subscription ON articles(subscription_id)")
    
    conn.commit()
    conn.close()
    print(f"[SyncBackend] Database initialized at {DATABASE_PATH}")

# ============ Pydantic Models ============

class ChangePayload(BaseModel):
    entity_type: Literal["subscription", "article", "read_status"]
    entity_id: str
    operation: Literal["create", "update", "delete"]
    data: dict
    timestamp: int

class SyncBatchRequest(BaseModel):
    client_id: str
    changes: list[ChangePayload]
    last_sync_timestamp: int

class SyncResponse(BaseModel):
    changes: list[dict]
    server_timestamp: int
    has_more: bool = False

class SubscriptionCreate(BaseModel):
    name: str
    url: str
    category: Optional[str] = None

class ArticleUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_bookmarked: Optional[bool] = None

# ============ JWT Helpers ============

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_client_token(client_id: str) -> str:
    """Create JWT token for client."""
    payload = {
        "client_id": client_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return client_id."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("client_id")
    except jwt.PyJWTError:
        return None

# ============ WebSocket Connection Manager ============

class ConnectionManager:
    """管理 WebSocket 连接，支持实时同步."""
    
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.lock = asyncio.Lock()
    
    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections[client_id] = websocket
        print(f"[WS] Client {client_id} connected. Total: {len(self.active_connections)}")
    
    async def disconnect(self, client_id: str):
        async with self.lock:
            if client_id in self.active_connections:
                del self.active_connections[client_id]
        print(f"[WS] Client {client_id} disconnected. Total: {len(self.active_connections)}")
    
    async def send_to(self, client_id: str, message: dict):
        """发送消息到指定客户端."""
        async with self.lock:
            websocket = self.active_connections.get(client_id)
        
        if websocket:
            try:
                await websocket.send_json(message)
                return True
            except Exception as e:
                print(f"[WS] Send error to {client_id}: {e}")
                await self.disconnect(client_id)
                return False
        return False
    
    async def broadcast(self, message: dict, exclude_client: Optional[str] = None):
        """广播消息到所有已连接客户端 (除指定外)."""
        async with self.lock:
            connections = list(self.active_connections.items())
        
        for client_id, websocket in connections:
            if client_id != exclude_client:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    print(f"[WS] Broadcast error to {client_id}: {e}")
                    await self.disconnect(client_id)

manager = ConnectionManager()

# ============ Database Helpers ============

def get_db():
    """获取数据库连接 (请求级)."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def row_to_dict(row: sqlite3.Row) -> dict:
    """Convert sqlite3.Row to dict."""
    return dict(row)

# ============ Sync Logic ============

def log_change(conn: sqlite3.Connection, client_id: str, change: ChangePayload):
    """记录变更到 sync_log 表."""
    cursor = conn.cursor()
    
    # 获取/创建向量时钟
    cursor.execute("SELECT clock FROM vector_clocks WHERE client_id = ?", (client_id,))
    row = cursor.fetchone()
    if row:
        vector_clock = row[0] + 1
    else:
        vector_clock = 1
    
    cursor.execute("""
        INSERT INTO vector_clocks (client_id, clock) VALUES (?, ?)
        ON CONFLICT(client_id) DO UPDATE SET clock = ?
    """, (client_id, vector_clock, vector_clock))
    
    # 记录变更
    cursor.execute("""
        INSERT INTO sync_log 
        (client_id, entity_type, entity_id, operation, payload, timestamp, vector_clock, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        client_id,
        change.entity_type,
        change.entity_id,
        change.operation,
        json.dumps(change.data),
        change.timestamp,
        vector_clock,
        int(time.time() * 1000)
    ))
    
    conn.commit()
    return vector_clock

def get_changes_since(conn: sqlite3.Connection, client_id: str, since_timestamp: int) -> list[dict]:
    """获取自指定时间戳以来的所有变更."""
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM sync_log 
        WHERE timestamp > ? AND client_id != ?
        ORDER BY timestamp ASC
    """, (since_timestamp, client_id))
    
    changes = []
    for row in cursor.fetchall():
        row_dict = row_to_dict(row)
        row_dict["payload"] = json.loads(row_dict["payload"])
        changes.append(row_dict)
    
    return changes

# ============ FastAPI App ============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理."""
    init_db()
    yield

app = FastAPI(
    title="ai-subscription Cloud Sync API",
    description="基于 thunderbolt PowerSync 架构的云端同步服务",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ REST API Endpoints ============

@app.get("/")
async def root():
    return {"service": "ai-subscription-sync", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": int(time.time() * 1000)}

# --- 客户端注册 ---

@app.post("/api/clients/register")
async def register_client(client_type: str = Query(...)):
    """注册新客户端，获取 JWT token."""
    client_id = str(uuid.uuid4())
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO clients (client_id, client_type, created_at)
        VALUES (?, ?, ?)
    """, (client_id, client_type, int(time.time() * 1000)))
    
    token = create_client_token(client_id)
    cursor.execute("UPDATE clients SET token = ? WHERE client_id = ?", (token, client_id))
    
    conn.commit()
    conn.close()
    
    return {"client_id": client_id, "token": token}

# --- 同步端点 ---

@app.get("/api/sync/{client_id}")
async def get_sync_changes(
    client_id: str,
    since: int = Query(default=0, description="自指定时间戳获取变更")
):
    """获取自指定时间戳以来的所有变更 (Delta Sync)."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    
    try:
        changes = get_changes_since(conn, client_id, since)
        
        # 更新客户端最后同步时间
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE clients SET last_sync_at = ? WHERE client_id = ?",
            (int(time.time() * 1000), client_id)
        )
        conn.commit()
        
        return SyncResponse(
            changes=changes,
            server_timestamp=int(time.time() * 1000),
            has_more=False
        )
    finally:
        conn.close()

@app.post("/api/sync/batch")
async def sync_batch(request: SyncBatchRequest):
    """批量提交本地变更到服务器."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    
    try:
        server_vector_clock = 0
        
        for change in request.changes:
            vc = log_change(conn, request.client_id, change)
            server_vector_clock = max(server_vector_clock, vc)
        
        # 广播变更给其他客户端
        await manager.broadcast({
            "type": "sync",
            "payload": {
                "changes": request.changes,
                "from_client": request.client_id
            }
        }, exclude_client=request.client_id)
        
        return {
            "status": "ok",
            "accepted": len(request.changes),
            "server_vector_clock": server_vector_clock,
            "server_timestamp": int(time.time() * 1000)
        }
    finally:
        conn.close()

# --- 订阅源 CRUD ---

@app.get("/api/subscriptions/{client_id}")
async def get_subscriptions(client_id: str):
    """获取客户端的所有订阅源."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM subscriptions 
            WHERE client_id = ? AND deleted_at IS NULL
            ORDER BY created_at DESC
        """, (client_id,))
        
        subscriptions = [row_to_dict(row) for row in cursor.fetchall()]
        return {"subscriptions": subscriptions}
    finally:
        conn.close()

@app.post("/api/subscriptions")
async def create_subscription(sub: SubscriptionCreate, client_id: str = Query(...)):
    """创建新订阅源."""
    conn = sqlite3.connect(DATABASE_PATH)
    
    try:
        cursor = conn.cursor()
        sub_id = str(uuid.uuid4())
        now = int(time.time() * 1000)
        
        cursor.execute("""
            INSERT INTO subscriptions (id, client_id, name, url, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (sub_id, client_id, sub.name, sub.url, sub.category, now, now))
        
        conn.commit()
        
        # 记录变更
        change = ChangePayload(
            entity_type="subscription",
            entity_id=sub_id,
            operation="create",
            data={"id": sub_id, "name": sub.name, "url": sub.url, "category": sub.category},
            timestamp=now
        )
        log_change(conn, client_id, change)
        
        return {"id": sub_id, "status": "created"}
    finally:
        conn.close()

@app.delete("/api/subscriptions/{subscription_id}")
async def delete_subscription(subscription_id: str, client_id: str = Query(...)):
    """软删除订阅源."""
    conn = sqlite3.connect(DATABASE_PATH)
    
    try:
        cursor = conn.cursor()
        now = int(time.time() * 1000)
        
        cursor.execute("""
            UPDATE subscriptions SET deleted_at = ?, updated_at = ? WHERE id = ?
        """, (now, now, subscription_id))
        
        conn.commit()
        
        # 记录变更
        change = ChangePayload(
            entity_type="subscription",
            entity_id=subscription_id,
            operation="delete",
            data={"deleted_at": now},
            timestamp=now
        )
        log_change(conn, client_id, change)
        
        return {"status": "deleted"}
    finally:
        conn.close()

# --- 文章状态 ---

@app.patch("/api/articles/{article_id}")
async def update_article(article_id: str, update: ArticleUpdate, client_id: str = Query(...)):
    """更新文章阅读状态."""
    conn = sqlite3.connect(DATABASE_PATH)
    
    try:
        cursor = conn.cursor()
        now = int(time.time() * 1000)
        
        update_data = {}
        if update.is_read is not None:
            update_data["is_read"] = update.is_read
        if update.is_bookmarked is not None:
            update_data["is_bookmarked"] = update.is_bookmarked
        
        if update.is_read is not None:
            cursor.execute("UPDATE articles SET is_read = ?, updated_at = ? WHERE id = ?",
                          (1 if update.is_read else 0, now, article_id))
        if update.is_bookmarked is not None:
            cursor.execute("UPDATE articles SET is_bookmarked = ?, updated_at = ? WHERE id = ?",
                          (1 if update.is_bookmarked else 0, now, article_id))
        
        conn.commit()
        
        # 记录变更
        change = ChangePayload(
            entity_type="read_status",
            entity_id=article_id,
            operation="update",
            data=update_data,
            timestamp=now
        )
        log_change(conn, client_id, change)
        
        return {"status": "updated"}
    finally:
        conn.close()

# ============ WebSocket Endpoint ============

@app.websocket("/ws/sync/{client_id}")
async def websocket_sync(websocket: WebSocket, client_id: str):
    """WebSocket 实时同步通道."""
    await manager.connect(client_id, websocket)
    
    try:
        # 发送连接确认
        await websocket.send_json({
            "type": "connected",
            "client_id": client_id,
            "timestamp": int(time.time() * 1000)
        })
        
        while True:
            # 接收客户端消息
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": int(time.time() * 1000)})
            
            elif msg_type == "push":
                # 客户端推送变更
                changes = data.get("payload", {}).get("changes", [])
                for change_data in changes:
                    change = ChangePayload(**change_data)
                    log_change_from_ws(client_id, change)
                
                # 广播给其他客户端
                await manager.broadcast({
                    "type": "sync",
                    "payload": {
                        "changes": changes,
                        "from_client": client_id
                    }
                }, exclude_client=client_id)
                
                await websocket.send_json({
                    "type": "ack",
                    "accepted": len(changes),
                    "timestamp": int(time.time() * 1000)
                })
            
            elif msg_type == "subscribe":
                # 订阅特定实体的变更
                entity_filter = data.get("payload", {}).get("entities", [])
                await websocket.send_json({
                    "type": "subscribed",
                    "entities": entity_filter
                })
    
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        print(f"[WS] Error for {client_id}: {e}")
        await manager.disconnect(client_id)

def log_change_from_ws(client_id: str, change: ChangePayload):
    """从 WebSocket 记录变更 (简化版)."""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        log_change(conn, client_id, change)
    finally:
        conn.close()

# ============ 启动说明 ============

if __name__ == "__main__":
    import uvicorn
    print("[SyncBackend] Starting ai-subscription Cloud Sync Server...")
    print("[SyncBackend] API: http://localhost:8001")
    print("[SyncBackend] WebSocket: ws://localhost:8001/ws/sync/{client_id}")
    uvicorn.run(app, host="0.0.0.0", port=8001)