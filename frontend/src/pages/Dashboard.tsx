import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Kanban from '../components/Kanban';
import AddApplication from '../components/AddApplication';

const Dashboard = () => {
  const { logout } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Job Application Tracker</h1>
        <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </header>
      <main className="p-4">
        <button onClick={() => setShowAdd(true)} className="bg-blue-500 text-white px-4 py-2 rounded mb-4">Add Application</button>
        <Kanban />
        {showAdd && <AddApplication onClose={() => setShowAdd(false)} />}
      </main>
    </div>
  );
};

export default Dashboard;