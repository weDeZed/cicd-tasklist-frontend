import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasks } from '../hooks/useTasks';
import * as taskApi from '../api/taskApi';

vi.mock('../api/taskApi');

const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'Test description',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('useTasks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads tasks on mount', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toEqual([mockTask]);
    expect(result.current.error).toBeNull();
  });

  it('sets error when loadTasks fails', async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.tasks).toEqual([]);
  });

  it('sets generic error for non-Error rejections', async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValue('oops');
    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Une erreur est survenue');
  });

  it('addTask prepends new task to list', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
    const newTask = { ...mockTask, id: 2, title: 'New Task' };
    vi.mocked(taskApi.createTask).mockResolvedValue(newTask);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addTask({ title: 'New Task' });
    });

    expect(result.current.tasks[0]).toEqual(newTask);
    expect(result.current.tasks.length).toBe(2);
  });

  it('editTask updates the matching task', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
    const updated = { ...mockTask, title: 'Updated' };
    vi.mocked(taskApi.updateTask).mockResolvedValue(updated);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.editTask(1, { title: 'Updated' });
    });

    expect(result.current.tasks[0].title).toBe('Updated');
  });

  it('removeTask removes the task from the list', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
    vi.mocked(taskApi.deleteTask).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeTask(1);
    });

    expect(result.current.tasks).toEqual([]);
  });

  it('toggleComplete flips completed status', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);
    const toggled = { ...mockTask, completed: true };
    vi.mocked(taskApi.updateTask).mockResolvedValue(toggled);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete(1);
    });

    expect(result.current.tasks[0].completed).toBe(true);
  });

  it('toggleComplete does nothing if task not found', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete(999);
    });

    expect(taskApi.updateTask).not.toHaveBeenCalled();
  });

  it('loadTasks can be called manually to reload', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask]);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const secondTask = { ...mockTask, id: 2, title: 'Second' };
    vi.mocked(taskApi.getTasks).mockResolvedValue([mockTask, secondTask]);

    await act(async () => {
      await result.current.loadTasks();
    });

    expect(result.current.tasks.length).toBe(2);
  });
});