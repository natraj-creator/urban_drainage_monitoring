from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routes import alerts, nodes, readings
from .ws_manager import manager

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Urban Drainage Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nodes.router)
app.include_router(readings.router)
app.include_router(alerts.router)


@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/")
def root():
    return {"status": "ok", "service": "drainage-monitor-api"}
