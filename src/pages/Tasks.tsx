import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { PlusCircle, Edit2, Trash2, Calendar, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date: any;
  project_id: string;
  assigned_to: string;
  created_by: string;
  created_at: any;
}

function Tasks() {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending' as const,
    due_date: '',
    project_id: '',
    assigned_to: ''
  });
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery('tasks', async () => {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('created_by', '==', user?.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });

  const { data: projects = [] } = useQuery('projects', async () => {
    const projectsRef = collection(db, 'projects');
    const snapshot = await getDocs(projectsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });

  const { data: users = [] } = useQuery('users', async () => {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });

  const createTask = useMutation(
    async (taskData: typeof formData) => {
      const tasksRef = collection(db, 'tasks');
      await addDoc(tasksRef, {
        ...taskData,
        created_by: user?.uid,
        created_at: serverTimestamp()
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setShowModal(false);
        toast.success('Task created successfully');
      },
      onError: () => {
        toast.error('Failed to create task');
      }
    }
  );

  const updateTask = useMutation(
    async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setShowModal(false);
        toast.success('Task updated successfully');
      },
      onError: () => {
        toast.error('Failed to update task');
      }
    }
  );

  const deleteTask = useMutation(
    async (taskId: string) => {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        setShowDeleteConfirm(null);
        toast.success('Task deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete task');
      }
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        data: formData
      });
    } else {
      createTask.mutate(formData);
    }
  };

  const handleDelete = (taskId: string) => {
    setShowDeleteConfirm(taskId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteTask.mutate(showDeleteConfirm);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your tasks and assignments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setFormData({
              title: '',
              description: '',
              status: 'pending',
              due_date: '',
              project_id: '',
              assigned_to: ''
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task: Task) => (
          <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{task.title}</h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${getStatusColor(task.status)}`}>
                  {getStatusIcon(task.status)}
                  <span className="ml-1">{task.status.toUpperCase()}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{task.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  Due: {new Date(task.due_date).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4 mr-2" />
                  Assigned to: {users.find(u => u.id === task.assigned_to)?.fullName || 'Unassigned'}
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingTask(task);
                    setFormData({
                      title: task.title,
                      description: task.description,
                      status: task.status,
                      due_date: task.due_date,
                      project_id: task.project_id,
                      assigned_to: task.assigned_to
                    });
                    setShowModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-full"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Task
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
            <form onSubmit={handleSubmit} className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Task Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project
                  </label>
                  <select
                    required
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Assign To
                  </label>
                  <select
                    required
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus: border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select Team Member</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;