from fastapi import FastAPI

from app.database import Base, engine
from app.routers import users, tasks
from app import models

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Task Manager API",
    description="Multi-user Task Manager API",
    version="1.0.0"
)

app.mount(
    "/static",
    StaticFiles(directory="app/static"),
    name="static"
)


@app.get("/app", include_in_schema=False)
def frontend():
    return FileResponse("app/static/index.html")


app.include_router(users.router)
app.include_router(tasks.router)


@app.get("/")
def home():
    return {
        "message": "Task Manager API is running"
    }
