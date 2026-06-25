import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as taskApi from '../api/taskApi';

const mockTask = {
  id: 1,
  title: 'Test Task',
  description: 'Test description',
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('taskApi', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getTasks', () => {
    it('returns list of tasks on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockTask],
      });
      const result = await taskApi.getTasks();
      expect(result).toEqual([mockTask]);
      expect(fetch).toHaveBeenCalledWith('/api/tasks');
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });
      await expect(taskApi.getTasks()).rejects.toThrow('HTTP 500');
    });
  });

  describe('getTask', () => {
    it('returns single task', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTask,
      });
      const result = await taskApi.getTask(1);
      expect(result).toEqual(mockTask);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/1');
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });
      await expect(taskApi.getTask(99)).rejects.toThrow('HTTP 404');
    });
  });

  describe('createTask', () => {
    it('creates a task and returns it', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTask,
      });
      const result = await taskApi.createTask({ title: 'Test Task', description: 'Test description' });
      expect(result).toEqual(mockTask);
      expect(fetch).toHaveBeenCalledWith('/api/tasks', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Task', description: 'Test description' }),
      }));
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });
      await expect(taskApi.createTask({ title: '' })).rejects.toThrow('HTTP 400');
    });
  });

  describe('updateTask', () => {
    it('updates and returns the task', async () => {
      const updated = { ...mockTask, title: 'Updated' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => updated,
      });
      const result = await taskApi.updateTask(1, { title: 'Updated' });
      expect(result).toEqual(updated);
      expect(fetch).toHaveBeenCalledWith('/api/tasks/1', expect.objectContaining({
        method: 'PUT',
      }));
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });
      await expect(taskApi.updateTask(99, { title: 'x' })).rejects.toThrow('HTTP 404');
    });
  });

  describe('deleteTask', () => {
    it('deletes task without error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      await expect(taskApi.deleteTask(1)).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith('/api/tasks/1', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });
      await expect(taskApi.deleteTask(99)).rejects.toThrow('HTTP 404');
    });
  });
});