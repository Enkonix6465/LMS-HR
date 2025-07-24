import React from 'react';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon, Settings as SettingsIcon } from 'lucide-react';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

function Settings() {
  const { theme, setTheme } = useThemeStore();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [changeMsg, setChangeMsg] = React.useState("");
  const auth = getAuth();
  const user = auth.currentUser;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeMsg("");
    if (!user || !user.email) return setChangeMsg("No user logged in.");
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setChangeMsg("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setChangeMsg(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your application preferences
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Appearance
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <Sun className={`h-5 w-5 mr-2 ${
                    theme === 'light' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'light'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    Light Mode
                  </span>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <Moon className={`h-5 w-5 mr-2 ${
                    theme === 'dark' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    theme === 'dark'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    Dark Mode
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mt-8">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <input
              type="password"
              placeholder="Current Password"
              className="w-full p-2 border rounded"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="New Password"
              className="w-full p-2 border rounded"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Change Password</button>
          </form>
          {changeMsg && <div className="mt-4 text-sm text-red-500">{changeMsg}</div>}
        </div>
      </div>
    </div>
  );
}

export default Settings;