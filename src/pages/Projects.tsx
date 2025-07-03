import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuthStore } from "../store/authStore";
import {
  PlusCircle,
  Edit2,
  Trash2,
  Calendar,
  Users,
  CheckCircle,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "delayed";
  deadline: any;
  team: string[];
  created_by: string;
  created_at: any;
}

function Projects() {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as const,
    deadline: "",
    team: [] as string[],
  });
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: projects = [], isLoading } = useQuery("projects", async () => {
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("created_by", "==", user?.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

  const { data: users = [] } = useQuery("users", async () => {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  });

  const createProject = useMutation(
    async (projectData: typeof formData) => {
      const projectsRef = collection(db, "projects");
      await addDoc(projectsRef, {
        ...projectData,
        created_by: user?.uid,
        created_at: serverTimestamp(),
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("projects");
        setShowModal(false);
        toast.success("Project created successfully");
      },
      onError: () => {
        toast.error("Failed to create project");
      },
    }
  );

  const updateProject = useMutation(
    async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const projectRef = doc(db, "projects", id);
      await updateDoc(projectRef, data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("projects");
        setShowModal(false);
        toast.success("Project updated successfully");
      },
      onError: () => {
        toast.error("Failed to update project");
      },
    }
  );

  const deleteProject = useMutation(
    async (projectId: string) => {
      const projectRef = doc(db, "projects", projectId);
      await deleteDoc(projectRef);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("projects");
        setShowDeleteConfirm(null);
        toast.success("Project deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete project");
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateProject.mutate({
        id: editingProject.id,
        data: formData,
      });
    } else {
      createProject.mutate(formData);
    }
  };

  const handleDelete = (projectId: string) => {
    setShowDeleteConfirm(projectId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteProject.mutate(showDeleteConfirm);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your projects and team assignments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setFormData({
              name: "",
              description: "",
              status: "active",
              deadline: "",
              team: [],
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center hover:bg-blue-700"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: Project) => (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {project.name}
                </h2>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    project.status
                  )}`}
                >
                  {project.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {project.description}
              </p>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  Deadline: {new Date(project.deadline).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4 mr-2" />
                  Team: {project.team?.length || 0} members
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingProject(project);
                    setFormData({
                      name: project.name,
                      description: project.description,
                      status: project.status,
                      deadline: project.deadline,
                      team: project.team,
                    });
                    setShowModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-full"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
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
              Delete Project
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete this project? This action cannot
              be undone.
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
                {editingProject ? "Edit Project" : "Create New Project"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as
                          | "active"
                          | "completed"
                          | "delayed",
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) =>
                      setFormData({ ...formData, deadline: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Team Members
                  </label>
                  <select
                    multiple
                    value={formData.team}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        team: Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        ),
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
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
                  {editingProject ? "Update Project" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
