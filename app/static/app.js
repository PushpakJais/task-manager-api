const tokenKey = "task_manager_token";
const emailKey = "task_manager_email";

let isRegisterMode = false;
let tasks = [];

const authSection = document.getElementById("auth-section");
const dashboard = document.getElementById("dashboard");
const authForm = document.getElementById("auth-form");
const authMessage = document.getElementById("auth-message");
const authSubmit = document.getElementById("auth-submit");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

document.getElementById("login-tab").onclick = () => setAuthMode(false);
document.getElementById("register-tab").onclick = () => setAuthMode(true);
document.getElementById("logout-btn").onclick = logout;
document.getElementById("refresh-btn").onclick = loadTasks;
document.getElementById("cancel-edit-btn").onclick = resetTaskForm;
document.getElementById("task-form").onsubmit = saveTask;

function setAuthMode(register) {
    isRegisterMode = register;
    document.getElementById("login-tab").classList.toggle("active", !register);
    document.getElementById("register-tab").classList.toggle("active", register);
    authSubmit.textContent = register ? "Register" : "Login";
    authMessage.textContent = "";
}

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authMessage.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        if (isRegisterMode) {
            const response = await fetch("/auth/register", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, password})
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Registration failed");

            setAuthMode(false);
            passwordInput.value = "";
            authMessage.textContent = "Registration successful. Please login.";
            return;
        }

        const body = new URLSearchParams();
        body.append("username", email);
        body.append("password", password);

        const response = await fetch("/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Login failed");

        localStorage.setItem(tokenKey, data.access_token);
        localStorage.setItem(emailKey, email);
        showDashboard();
    } catch (error) {
        authMessage.textContent = error.message;
    }
});

async function apiFetch(url, options = {}) {
    const token = localStorage.getItem(tokenKey);
    const headers = options.headers || {};
    headers["Authorization"] = `Bearer ${token}`;
    options.headers = headers;

    const response = await fetch(url, options);

    if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please login again.");
    }

    return response;
}

async function showDashboard() {
    authSection.classList.add("hidden");
    dashboard.classList.remove("hidden");
    document.getElementById("user-email").textContent =
        localStorage.getItem(emailKey) || "";
    resetTaskForm();
    await loadTasks();
}

async function loadTasks() {
    try {
        const response = await apiFetch("/tasks/");
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not load tasks");
        tasks = data;
        renderTasks();
    } catch (error) {
        document.getElementById("task-message").textContent = error.message;
    }
}

function renderTasks() {
    const list = document.getElementById("tasks-list");
    const completed = tasks.filter(t => t.is_completed).length;

    document.getElementById("total-count").textContent = tasks.length;
    document.getElementById("completed-count").textContent = completed;
    document.getElementById("pending-count").textContent = tasks.length - completed;

    if (!tasks.length) {
        list.innerHTML = "<p>No tasks yet. Create your first task above.</p>";
        return;
    }

    list.innerHTML = tasks.map(task => `
        <div class="task">
            <div class="task-row">
                <div>
                    <h3>${escapeHtml(task.title)}</h3>
                    <p>${escapeHtml(task.description || "")}</p>
                    <span class="status ${task.is_completed ? "completed" : "pending"}">
                        ${task.is_completed ? "Completed" : "Pending"}
                    </span>
                </div>
                <div>ID: ${task.id}</div>
            </div>
            <div class="task-actions">
                <button onclick="editTask(${task.id})" class="secondary">Edit</button>
                ${task.is_completed
                    ? `<button onclick="setComplete(${task.id}, false)" class="secondary">Mark Pending</button>`
                    : `<button onclick="setComplete(${task.id}, true)" class="complete">Complete</button>`}
                <button onclick="deleteTask(${task.id})" class="delete">Delete</button>
            </div>
        </div>
    `).join("");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById("task-id").value = task.id;
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description || "";
    document.getElementById("form-title").textContent = "Edit Task";
    document.getElementById("save-task-btn").textContent = "Update Task";
    document.getElementById("cancel-edit-btn").classList.remove("hidden");
    window.scrollTo({top: 0, behavior: "smooth"});
}

async function saveTask(e) {
    e.preventDefault();

    const id = document.getElementById("task-id").value;
    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-description").value.trim();

    try {
        let response;

        if (id) {
            response = await apiFetch(`/tasks/${id}`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({title, description})
            });
        } else {
            response = await apiFetch("/tasks/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({title, description})
            });
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not save task");

        resetTaskForm();
        await loadTasks();
    } catch (error) {
        document.getElementById("task-message").textContent = error.message;
    }
}

async function setComplete(id, completed) {
    try {
        const response = await apiFetch(`/tasks/${id}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({is_completed: completed})
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not update task");

        await loadTasks();
    } catch (error) {
        document.getElementById("task-message").textContent = error.message;
    }
}

async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;

    try {
        const response = await apiFetch(`/tasks/${id}`, {method: "DELETE"});
        if (!response.ok && response.status !== 204) {
            const data = await response.json();
            throw new Error(data.detail || "Could not delete task");
        }
        await loadTasks();
    } catch (error) {
        document.getElementById("task-message").textContent = error.message;
    }
}

function resetTaskForm() {
    document.getElementById("task-id").value = "";
    document.getElementById("task-title").value = "";
    document.getElementById("task-description").value = "";
    document.getElementById("form-title").textContent = "Add Task";
    document.getElementById("save-task-btn").textContent = "Create Task";
    document.getElementById("cancel-edit-btn").classList.add("hidden");
    document.getElementById("task-message").textContent = "";
}

function logout() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(emailKey);
    dashboard.classList.add("hidden");
    authSection.classList.remove("hidden");
    passwordInput.value = "";
}

if (localStorage.getItem(tokenKey)) {
    showDashboard();
}
