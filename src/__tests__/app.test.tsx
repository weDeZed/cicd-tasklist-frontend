import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockTasks = [
  {
    id: 1,
    title: 'Tâche 1',
    description: 'Description 1',
    completed: false,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    title: 'Tâche 2',
    description: null,
    completed: true,
    createdAt: '2024-01-16T10:00:00.000Z',
    updatedAt: '2024-01-16T10:00:00.000Z',
  },
];

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

// ─── taskApi tests ─────────────────────────────────────────────────────────────

describe('taskApi', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('getTasks — retourne la liste des tâches', async () => {
    mockFetchResponse(mockTasks);
    const { getTasks } = await import('../api/taskApi');
    const result = await getTasks();
    expect(result).toEqual(mockTasks);
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks');
  });

  it('getTask — retourne une tâche par id', async () => {
    mockFetchResponse(mockTasks[0]);
    const { getTask } = await import('../api/taskApi');
    const result = await getTask(1);
    expect(result).toEqual(mockTasks[0]);
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/1');
  });

  it('createTask — crée une tâche et la retourne', async () => {
    mockFetchResponse(mockTasks[0]);
    const { createTask } = await import('../api/taskApi');
    const payload = { title: 'Tâche 1', description: 'Description 1' };
    const result = await createTask(payload);
    expect(result).toEqual(mockTasks[0]);
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('updateTask — met à jour une tâche', async () => {
    const updated = { ...mockTasks[0], completed: true };
    mockFetchResponse(updated);
    const { updateTask } = await import('../api/taskApi');
    const result = await updateTask(1, { completed: true });
    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith('/api/tasks/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
  });

  it('deleteTask — supprime une tâche (204)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
    const { deleteTask } = await import('../api/taskApi');
    await expect(deleteTask(1)).resolves.toBeUndefined();
  });

  it('handleResponse — lève une erreur si !ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });
    const { getTasks } = await import('../api/taskApi');
    await expect(getTasks()).rejects.toThrow('HTTP 404: Not Found');
  });

  it('deleteTask — lève une erreur si !ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
    });
    const { deleteTask } = await import('../api/taskApi');
    await expect(deleteTask(1)).rejects.toThrow('HTTP 500: Server Error');
  });
});

// ─── useTasks hook tests ────────────────────────────────────────────────────────

import { renderHook } from '@testing-library/react';

describe('useTasks', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('charge les tâches au montage', async () => {
    mockFetchResponse(mockTasks);
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toEqual(mockTasks);
    expect(result.current.error).toBeNull();
  });

  it('gère une erreur au chargement', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Server Error',
    });
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('HTTP 500: Server Error');
    expect(result.current.tasks).toEqual([]);
  });

  it('addTask — ajoute une tâche en tête de liste', async () => {
    mockFetchResponse(mockTasks); // initial load
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newTask = { id: 3, title: 'Nouvelle', description: null, completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mockFetchResponse(newTask);
    await act(async () => {
      await result.current.addTask({ title: 'Nouvelle' });
    });
    expect(result.current.tasks[0]).toEqual(newTask);
    expect(result.current.tasks).toHaveLength(3);
  });

  it('editTask — met à jour une tâche existante', async () => {
    mockFetchResponse(mockTasks);
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const updated = { ...mockTasks[0], title: 'Modifiée' };
    mockFetchResponse(updated);
    await act(async () => {
      await result.current.editTask(1, { title: 'Modifiée' });
    });
    expect(result.current.tasks.find((t) => t.id === 1)?.title).toBe('Modifiée');
  });

  it('removeTask — supprime une tâche', async () => {
    mockFetchResponse(mockTasks);
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
    await act(async () => {
      await result.current.removeTask(1);
    });
    expect(result.current.tasks.find((t) => t.id === 1)).toBeUndefined();
    expect(result.current.tasks).toHaveLength(1);
  });

  it('toggleComplete — bascule le statut completed', async () => {
    mockFetchResponse(mockTasks);
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const toggled = { ...mockTasks[0], completed: true };
    mockFetchResponse(toggled);
    await act(async () => {
      await result.current.toggleComplete(1);
    });
    expect(result.current.tasks.find((t) => t.id === 1)?.completed).toBe(true);
  });

  it('toggleComplete — ne fait rien si la tâche est introuvable', async () => {
    mockFetchResponse(mockTasks);
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete(999);
    });
    expect(mockFetch).toHaveBeenCalledTimes(1); // only initial load
  });

  it('loadTasks — peut être rappelé manuellement', async () => {
    mockFetchResponse(mockTasks);
    const { useTasks } = await import('../hooks/useTasks');
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetchResponse([mockTasks[0]]);
    await act(async () => {
      await result.current.loadTasks();
    });
    expect(result.current.tasks).toHaveLength(1);
  });
});

// ─── TaskForm tests ─────────────────────────────────────────────────────────────

import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
  it('affiche le formulaire de création par défaut', () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Nouvelle tâche')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Titre de la tâche *')).toBeInTheDocument();
    expect(screen.getByText('Ajouter')).toBeInTheDocument();
  });

  it('affiche le formulaire de modification si mode="edit"', () => {
    render(<TaskForm onSubmit={vi.fn()} mode="edit" />);
    expect(screen.getByText('Modifier la tâche')).toBeInTheDocument();
    expect(screen.getByText('Modifier')).toBeInTheDocument();
  });

  it('pré-remplit les valeurs initiales', () => {
    render(<TaskForm onSubmit={vi.fn()} initialValues={{ title: 'Mon titre', description: 'Ma desc' }} />);
    expect(screen.getByDisplayValue('Mon titre')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ma desc')).toBeInTheDocument();
  });

  it('affiche une erreur si le titre est vide à la soumission', async () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Ajouter'));
    expect(await screen.findByText('Le titre est requis')).toBeInTheDocument();
  });

  it('appelle onSubmit avec les bonnes données', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText('Titre de la tâche *'), 'Ma tâche');
    await userEvent.type(screen.getByPlaceholderText('Description (optionnel)'), 'Ma description');
    fireEvent.click(screen.getByText('Ajouter'));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Ma tâche', description: 'Ma description' });
  });

  it('réinitialise les champs après soumission en mode create', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText('Titre de la tâche *'), 'Tâche à effacer');
    fireEvent.click(screen.getByText('Ajouter'));
    expect(screen.getByPlaceholderText('Titre de la tâche *')).toHaveValue('');
  });

  it('n\'envoie pas description si vide', async () => {
    const onSubmit = vi.fn();
    render(<TaskForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText('Titre de la tâche *'), 'Titre seul');
    fireEvent.click(screen.getByText('Ajouter'));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'Titre seul', description: undefined });
  });

  it('affiche le bouton Annuler si onCancel fourni', () => {
    render(<TaskForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Annuler')).toBeInTheDocument();
  });

  it('appelle onCancel au clic sur Annuler', async () => {
    const onCancel = vi.fn();
    render(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Annuler'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('efface l\'erreur dès que l\'utilisateur tape dans le titre', async () => {
    render(<TaskForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByText('Ajouter'));
    expect(await screen.findByText('Le titre est requis')).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText('Titre de la tâche *'), 'a');
    expect(screen.queryByText('Le titre est requis')).not.toBeInTheDocument();
  });
});

// ─── TaskList tests ─────────────────────────────────────────────────────────────

import { TaskList } from '../components/TaskList';
import type { UpdateTaskPayload } from '../types/task';

const defaultListProps = {
  tasks: mockTasks,
  loading: false,
  error: null,
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
};

describe('TaskList', () => {
  it('affiche le spinner pendant le chargement', () => {
    render(<TaskList {...defaultListProps} loading={true} tasks={[]} />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('affiche l\'erreur si error non null', () => {
    render(<TaskList {...defaultListProps} error="Erreur réseau" tasks={[]} />);
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByText(/Erreur réseau/)).toBeInTheDocument();
  });

  it('affiche l\'état vide si aucune tâche', () => {
    render(<TaskList {...defaultListProps} tasks={[]} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
  });

  it('affiche les tâches', () => {
    render(<TaskList {...defaultListProps} />);
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('task-item')).toHaveLength(2);
  });

  it('affiche le bon nombre de tâches terminées', () => {
    render(<TaskList {...defaultListProps} />);
    expect(screen.getByText('1 terminée')).toBeInTheDocument();
  });

  it('pluralise correctement "tâches"', () => {
    render(<TaskList {...defaultListProps} />);
    expect(screen.getByText('2 tâches')).toBeInTheDocument();
  });

  it('singulier pour une seule tâche', () => {
    render(<TaskList {...defaultListProps} tasks={[mockTasks[0]]} />);
    expect(screen.getByText('1 tâche')).toBeInTheDocument();
  });

  it('pluralise "terminées" pour plusieurs', () => {
    const allDone = mockTasks.map((t) => ({ ...t, completed: true }));
    render(<TaskList {...defaultListProps} tasks={allDone} />);
    expect(screen.getByText('2 terminées')).toBeInTheDocument();
  });
});

// ─── TaskItem tests ─────────────────────────────────────────────────────────────

import { TaskItem } from '../components/TaskItem';

const taskItemProps = {
  task: mockTasks[0],
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
};

describe('TaskItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le titre et la description', () => {
    render(<TaskItem {...taskItemProps} />);
    expect(screen.getByText('Tâche 1')).toBeInTheDocument();
    expect(screen.getByText('Description 1')).toBeInTheDocument();
  });

  it('n\'affiche pas la description si null', () => {
    render(<TaskItem {...taskItemProps} task={mockTasks[1]} />);
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });

  it('applique la classe task-completed si completed', () => {
    render(<TaskItem {...taskItemProps} task={mockTasks[1]} />);
    expect(screen.getByTestId('task-item')).toHaveClass('task-completed');
  });

  it('appelle onToggle au clic sur la checkbox', () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(taskItemProps.onToggle).toHaveBeenCalledWith(1);
  });

  it('passe en mode édition au clic sur le bouton modifier', () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByTitle('Modifier'));
    expect(screen.getByPlaceholderText('Titre de la tâche')).toBeInTheDocument();
  });

  it('appelle onEdit avec les nouvelles valeurs', async () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByTitle('Modifier'));
    const titleInput = screen.getByPlaceholderText('Titre de la tâche');
    fireEvent.change(titleInput, { target: { value: 'Titre modifié' } });
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(taskItemProps.onEdit).toHaveBeenCalledWith(1, {
      title: 'Titre modifié',
      description: 'Description 1',
    });
  });

  it('n\'enregistre pas si le titre est vide', () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByTitle('Modifier'));
    const titleInput = screen.getByPlaceholderText('Titre de la tâche');
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(taskItemProps.onEdit).not.toHaveBeenCalled();
  });

  it('annule l\'édition et restaure les valeurs', () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByTitle('Modifier'));
    const titleInput = screen.getByPlaceholderText('Titre de la tâche');
    fireEvent.change(titleInput, { target: { value: 'Valeur modifiée' } });
    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.getByText('Tâche 1')).toBeInTheDocument();
    expect(taskItemProps.onEdit).not.toHaveBeenCalled();
  });

  it('première suppression affiche l\'icône ⚠️', () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByTitle('Supprimer'));
    expect(screen.getByText('⚠️')).toBeInTheDocument();
    expect(taskItemProps.onDelete).not.toHaveBeenCalled();
  });

  it('deuxième suppression appelle onDelete', () => {
    render(<TaskItem {...taskItemProps} />);
    fireEvent.click(screen.getByTitle('Supprimer'));
    fireEvent.click(screen.getByTitle('Supprimer'));
    expect(taskItemProps.onDelete).toHaveBeenCalledWith(1);
  });

  it('description vide → undefined dans onEdit', () => {
    render(<TaskItem {...taskItemProps} task={mockTasks[1]} />);
    fireEvent.click(screen.getByTitle('Modifier'));
    fireEvent.click(screen.getByText('Enregistrer'));
    expect(taskItemProps.onEdit).toHaveBeenCalledWith(2, {
      title: 'Tâche 2',
      description: undefined,
    });
  });

  it('affiche la date de création formatée', () => {
    render(<TaskItem {...taskItemProps} />);
    // 15 janvier 2024 en français
    expect(screen.getByText(/janvier/i)).toBeInTheDocument();
  });
});

// ─── App integration tests ──────────────────────────────────────────────────────

import App from '../App';

describe('App', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('affiche le spinner puis les tâches', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockTasks,
      text: async () => '',
    });
    render(<App />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());
    expect(screen.getAllByTestId('task-item')).toHaveLength(2);
  });

  it('ajoute une tâche via le formulaire', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [],
      text: async () => '',
    });
    const newTask = { id: 10, title: 'Nouvelle tâche', description: null, completed: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 201,
      json: async () => newTask,
      text: async () => '',
    });

    render(<App />);
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('Titre de la tâche *'), 'Nouvelle tâche');
    fireEvent.click(screen.getByText('Ajouter'));
    await waitFor(() => expect(screen.getByText('Nouvelle tâche')).toBeInTheDocument());
  });

  it('gère les erreurs d\'ajout silencieusement', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [],
      text: async () => '',
    });
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 500,
      text: async () => 'Server Error',
    });

    render(<App />);
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('Titre de la tâche *'), 'Tâche erreur');
    fireEvent.click(screen.getByText('Ajouter'));
    // Pas de crash — le catch dans App absorbe l'erreur
    await waitFor(() => expect(screen.queryByText('Tâche erreur')).not.toBeInTheDocument());
  });
});
