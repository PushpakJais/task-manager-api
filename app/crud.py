from sqlalchemy.orm import Session

from app import models, schemas


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(
        models.User.email == email
    ).first()


def create_user(db: Session, email: str, hashed_password: str):
    user = models.User(
        email=email,
        hashed_password=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def create_task(
    db: Session,
    task: schemas.TaskCreate,
    owner_id: int
):
    db_task = models.Task(
        title=task.title,
        description=task.description,
        owner_id=owner_id
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return db_task


def get_tasks(
    db: Session,
    owner_id: int,
    skip: int = 0,
    limit: int = 100
):
    return (
        db.query(models.Task)
        .filter(models.Task.owner_id == owner_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_task(
    db: Session,
    task_id: int,
    owner_id: int
):
    return (
        db.query(models.Task)
        .filter(
            models.Task.id == task_id,
            models.Task.owner_id == owner_id
        )
        .first()
    )


def update_task(
    db: Session,
    db_task: models.Task,
    updates: schemas.TaskUpdate
):
    update_data = updates.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_task, field, value)

    db.commit()
    db.refresh(db_task)

    return db_task


def delete_task(
    db: Session,
    db_task: models.Task
):
    db.delete(db_task)
    db.commit()
    