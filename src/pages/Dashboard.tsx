import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  TrendingUp,
  BarChart2,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  getProjectStats,
  getTaskStats,
  getTeamStats,
  getRecentActivity,
} from "../lib/firebase";

function Dashboard() {
  const { data: projectStats, isLoading: loadingProjects } = useQuery(
    "projectStats",
    getProjectStats,
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: taskStats, isLoading: loadingTasks } = useQuery(
    "taskStats",
    getTaskStats,
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: teamStats, isLoading: loadingTeam } = useQuery(
    "teamStats",
    getTeamStats,
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: recentActivity, isLoading: loadingActivity } = useQuery(
    "recentActivity",
    getRecentActivity,
    { staleTime: 1 * 60 * 1000 }
  );

  const isLoading =
    loadingProjects || loadingTasks || loadingTeam || loadingActivity;

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = () => {
      if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser.");
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error.message);
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    fetchLocation();
  }, []);

  if (isLoading || locationLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Welcome back! Here's what's happening with your projects.
        </p>
        {location && (
          <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
            📍 Current Location: {location.lat.toFixed(6)},{" "}
            {location.lng.toFixed(6)}
          </p>
        )}
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Project Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Briefcase className="h-6 w-6 text-blue-500" />
              <div className="ml-5 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Active Projects
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {projectStats?.active}
                  </div>
                  <div className="ml-2 text-sm font-semibold text-green-600 dark:text-green-400 flex items-center">
                    <TrendingUp className="h-4 w-4" />
                    <span className="ml-1">
                      {(
                        ((projectStats?.active || 0) /
                          (projectStats?.total || 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Task Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-500" />
              <div className="ml-5 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Pending Tasks
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {taskStats?.pending}
                  </div>
                  <div className="ml-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center">
                    <AlertCircle className="h-4 w-4" />
                    <span className="ml-1">{taskStats?.overdue} overdue</span>
                  </div>
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Team Stats */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-indigo-500" />
              <div className="ml-5 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Team Members
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {teamStats?.totalMembers}
                  </div>
                  <div className="ml-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
                    <BarChart2 className="h-4 w-4" />
                    <span className="ml-1">
                      {
                        Object.keys(teamStats?.departmentDistribution || {})
                          .length
                      }{" "}
                      departments
                    </span>
                  </div>
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-green-500" />
              <div className="ml-5 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Completion Rate
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {(
                      ((taskStats?.completed || 0) / (taskStats?.total || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="ml-2 text-sm font-semibold text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="ml-1">{taskStats?.completed} tasks</span>
                  </div>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Department Distribution
          </h2>
          <div className="space-y-4">
            {Object.entries(teamStats?.departmentDistribution || {}).map(
              ([dept, count]) => (
                <div key={dept} className="flex items-center">
                  <div className="w-32 text-sm text-gray-600 dark:text-gray-400">
                    {dept}
                  </div>
                  <div className="flex-1">
                    <div className="relative h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-500 dark:bg-blue-600 rounded-full"
                        style={{
                          width: `${
                            (count / (teamStats?.totalMembers || 1)) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-gray-600 dark:text-gray-400">
                    {count}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivity?.map((activity, activityIdx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== recentActivity.length - 1 && (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                        <Users className="h-4 w-4 text-white" />
                      </span>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activity.action}{" "}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {activity.entity_type}
                          </span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Task Overview */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Task Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                Completed
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-green-800 dark:text-green-300">
              {taskStats?.completed}
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                In Progress
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-blue-800 dark:text-blue-300">
              {taskStats?.inProgress}
            </div>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
              <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                Pending
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-yellow-800 dark:text-yellow-300">
              {taskStats?.pending}
            </div>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400" />
              <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
                Overdue
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold text-red-800 dark:text-red-300">
              {taskStats?.overdue}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
