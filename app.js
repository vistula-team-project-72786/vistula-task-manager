let config = {};
let baseUrl = '';

const statusMsg = document.getElementById('status-message');
const taskList = document.getElementById('task-list');
const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descInput = document.getElementById('task-description');
const editIdInput = document.getElementById('edit-task-id');
const submitBtn = document.getElementById('task-submit');
const cancelBtn = document.getElementById('cancel-edit');

function showError(msg) {
  statusMsg.textContent = msg;
}

function clearError() {
  statusMsg.textContent = '';
}

function getHeaders() {
  return {
    'apikey': config.supabasePublishableKey,
    'Authorization': `Bearer ${config.supabasePublishableKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

async function fetchTasks() {
  clearError();
  try {
    const res = await fetch(`${baseUrl}?select=*&order=id.asc`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`Error loading tasks: ${res.statusText}`);
    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    showError(err.message);
  }
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  tasks.forEach(task => {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''}`;
    div.setAttribute('data-id', task.id);

    div.innerHTML = `
      <h3 class="task-title">${escapeHtml(task.title)}</h3>
      <p class="task-description">${escapeHtml(task.description || '')}</p>
      <p class="task-status">Status: ${task.completed ? 'Completed' : 'Incomplete'}</p>
      <div class="task-actions">
        <button class="toggle-task">${task.completed ? 'Mark Incomplete' : 'Mark Completed'}</button>
        <button class="edit-task">Edit</button>
        <button class="delete-task">Delete</button>
      </div>
    `;

    div.querySelector('.toggle-task').addEventListener('click', () => toggleTask(task));
    div.querySelector('.edit-task').addEventListener('click', () => startEdit(task));
    div.querySelector('.delete-task').addEventListener('click', () => deleteTask(task.id));

    taskList.appendChild(div);
  });
}

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const editId = editIdInput.value;

  if (!title) return;

  try {
    if (editId) {
      const res = await fetch(`${baseUrl}?id=eq.${editId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ title, description })
      });
      if (!res.ok) throw new Error('Failed to update task');
    } else {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title, description, completed: false })
      });
      if (!res.ok) throw new Error('Failed to create task');
    }

    resetForm();
    await fetchTasks();
  } catch (err) {
    showError(err.message);
  }
});

async function toggleTask(task) {
  clearError();
  try {
    const res = await fetch(`${baseUrl}?id=eq.${task.id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ completed: !task.completed })
    });
    if (!res.ok) throw new Error('Failed to toggle task status');
    await fetchTasks();
  } catch (err) {
    showError(err.message);
  }
}

async function deleteTask(id) {
  clearError();
  try {
    const res = await fetch(`${baseUrl}?id=eq.${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete task');
    await fetchTasks();
  } catch (err) {
    showError(err.message);
  }
}

function startEdit(task) {
  editIdInput.value = task.id;
  titleInput.value = task.title;
  descInput.value = task.description || '';
  submitBtn.textContent = 'Save Changes';
  cancelBtn.style.display = 'inline-block';
}

function resetForm() {
  editIdInput.value = '';
  taskForm.reset();
  submitBtn.textContent = 'Add Task';
  cancelBtn.style.display = 'none';
}

cancelBtn.addEventListener('click', resetForm);

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

fetch('config.json')
  .then(res => {
    if (!res.ok) throw new Error('Could not load config.json');
    return res.json();
  })
  .then(data => {
    config = data;
    baseUrl = `${config.supabaseUrl}/rest/v1/${config.tableName}`;
    fetchTasks();
  })
  .catch(err => showError(`Config Error: ${err.message}`));
