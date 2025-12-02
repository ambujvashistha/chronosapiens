import React from "react";
import {
  Briefcase,
  Gift,
  Users,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <header className="px-10 py-8 flex justify-between items-center">
        <h1 className="text-[34px] font-bold tracking-wide dark:text-white">Dashboard</h1>

        <div className="flex items-center gap-5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300">
            <Bell size={22} />
          </button>
        </div>
      </header>
      <div className="px-10 pb-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Applications"
            value="125"
            icon={<Briefcase size={22} className="text-orange-500" />}
          />
          <StatCard
            title="Offers"
            value="3"
            icon={<Gift size={22} className="text-orange-500" />}
          />
          <StatCard
            title="Interviews"
            value="8"
            icon={<Users size={22} className="text-orange-500" />}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-6 dark:text-white">Recent Applications</h2>

            <div className="space-y-6">
              <ApplicationRow role="Data Analytics" status="Applied" color="text-gray-500 dark:text-gray-400" />
              <ApplicationRow role="Frontend Engineer" status="In Review" color="text-gray-500 dark:text-gray-400" />
              <ApplicationRow role="Backend Developer" status="Interview" color="text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-5 dark:text-white">Progress</h2>

            <div className="h-40 flex items-end justify-center">
              <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                <path
                  d="M0 40 C 20 10, 40 10, 50 25 S 80 40, 100 10"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle cx="20" cy="20" r="2.4" fill="#f97316" />
                <circle cx="70" cy="22" r="2.4" fill="#f97316" />
              </svg>
            </div>
          </div>
        </div>


        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Upcoming Interview</h2>

          <div className="px-5 py-5 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white">Frontend Engineer - Nebula Labs</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">19-10-2025</p>
            </div>

            <span className="font-semibold text-gray-900 dark:text-white">01:00 PM</span>
          </div>
        </div>

      </div>

      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        JobSync © 2025
      </footer>
    </>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-36 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30">{icon}</div>
    </div>
    <span className="text-3xl font-bold dark:text-white">{value}</span>
  </div>
);

const ApplicationRow = ({ role, status, color }) => (
  <div className="flex justify-between items-center">
    <span className="font-medium text-gray-800 dark:text-gray-200">{role}</span>
    <span className={`text-sm font-semibold ${color}`}>{status}</span>
  </div>
);

export default Dashboard;
