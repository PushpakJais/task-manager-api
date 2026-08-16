from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db


router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)


@router.get(
    "/",
    response_model=list[schemas.TaskOut]
)
def list_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_tasks(
        db,
        owner_id=current_user.id,
        skip=skip,
        limit=limit
    )


@router.post(
    "/",
    response_model=schemas.TaskOut,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.create_task(
        db,
        task,
        owner_id=current_user.id
    )


@router.get(
    "/{task_id}",
    response_model=schemas.TaskOut
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_task = crud.get_task(
        db,
        task_id,
        owner_id=current_user.id
    )

    if db_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return db_task


@router.patch(
    "/{task_id}",
    response_model=schemas.TaskOut
)
def update_task(
    task_id: int,
    updates: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_task = crud.get_task(
        db,
        task_id,
        owner_id=current_user.id
    )

    if db_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    return crud.update_task(
        db,
        db_task,
        updates
    )


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_task = crud.get_task(
        db,
        task_id,
        owner_id=current_user.id
    )

    if db_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    crud.delete_task(db, db_task)
    