import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// The base URL for all API requests
const API_URL = 'http://localhost:5000/api';

// --- COMPONENTS ---

/**
 * A component to display the top 3 users in a sports-style podium.
 * @param {{topUsers: Array}} props - The top 3 users.
 */
const Podium = ({ topUsers }) => {
    // This array reorders the users to display them as 2nd, 1st, 3rd visually
    const podiumOrder = [1, 0, 2];
    const podiumUsers = podiumOrder.map(index => topUsers[index]).filter(Boolean);

    return (
        <div className="podium-container">
            {podiumUsers.map((user) => (
                <div key={user._id} className={`podium-step rank-${user.rank}`}>
                    <div className="podium-rank">{user.rank}</div>
                    <div className="podium-name">{user.name}</div>
                    <div className="podium-points">{user.points} pts</div>
                </div>
            ))}
        </div>
    );
};

/**
 * The main application component that manages all state and logic.
 */
function App() {
  // --- STATE MANAGEMENT ---
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for managing the visibility of various modals (pop-ups)
  const [isClearScoresModalOpen, setIsClearScoresModalOpen] = useState(false);
  const [isClearUsersModalOpen, setIsClearUsersModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  // State for the new actions dropdown menu
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // --- API & DATA FUNCTIONS ---

  /**
   * Fetches the list of all users from the backend API.
   */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
      if (response.data.length > 0) {
        setSelectedUserId(prevId => {
            if (!prevId || !response.data.find(u => u._id === prevId)) {
                return response.data[0]._id;
            }
            return prevId;
        });
      } else {
        setSelectedUserId('');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      if (err.message === 'Network Error') {
        setError('Network Error: Cannot connect to the server. Please make sure your Node.js backend is running on port 5000 and there are no errors in its terminal.');
      } else {
        setError(`An error occurred: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * An effect hook that runs once when the component first mounts.
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * --- NEW ---
   * Generates 10 random users and adds them to the database in parallel.
   */
  const handleGenerateTenUsers = useCallback(async () => {
      setIsLoading(true);
      const adjectives = ['Swift', 'Silent', 'Golden', 'Iron', 'Cosmic', 'Shadow', 'Crystal', 'Solar', 'Lunar', 'Crimson', 'Azure', 'Jade'];
      const nouns = ['Jaguar', 'Phoenix', 'Spectre', 'Golem', 'Voyager', 'Ninja', 'Dragon', 'Flare', 'Hunter', 'Warden', 'Knight', 'Sorcerer'];
      let createdCount = 0;
      const promises = [];

      for (let i = 0; i < 10; i++) {
          const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
          // Add the API call promise to an array. We don't 'await' here.
          promises.push(axios.post(`${API_URL}/users`, { name, points: 0 }));
      }

      try {
          // Promise.allSettled waits for all promises to either fulfill or reject.
          // This is more efficient than awaiting each request in a loop.
          const results = await Promise.allSettled(promises);
          results.forEach(result => {
              if (result.status === 'fulfilled') {
                  createdCount++;
              } else {
                  // Log errors for any requests that failed (e.g., duplicate name)
                  console.error(`Could not create a random user:`, result.reason?.response?.data?.message);
              }
          });

          if (createdCount > 0) {
              setMessage(`Generated ${createdCount} new random players!`);
              fetchUsers(); // Refresh the user list after creation is complete
          } else {
              setMessage('Failed to generate new users. They might already exist.');
          }
      } catch (err) {
          setError('An error occurred while generating users.');
      } finally {
          setIsLoading(false);
      }
  }, [fetchUsers]);


  /**
   * Handles the submission of the "Add User" form.
   */
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    try {
      const response = await axios.post(`${API_URL}/users`, { name: newUserName });
      setMessage(`User "${response.data.name}" added successfully!`);
      setNewUserName('');
      setIsAddUserModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      const errorMessage = err.response?.data?.message || (err.message === 'Network Error' ? 'Network Error: Check server connection.' : 'Failed to add user.');
      setMessage(`Error: ${errorMessage}`);
    }
  };

  /**
   * Handles the "Claim Points" button click for the selected user.
   */
  const handleClaimPoints = async () => {
    if (!selectedUserId) {
      setMessage('Please select a user first.');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/users/${selectedUserId}/claim`);
      const { updatedUser, pointsClaimed } = response.data;
      setMessage(`🎉 You claimed ${pointsClaimed} points for ${updatedUser.name}!`);
      fetchUsers();
    } catch (err) {
      console.error('Error claiming points:', err);
      setMessage(err.message === 'Network Error' ? 'Network Error: Check server connection.' : 'Failed to claim points.');
    }
  };

  /**
   * Handles the final confirmation to clear all user scores.
   */
  const handleClearAllScores = async () => {
    try {
        await axios.post(`${API_URL}/users/clear-scores`);
        setMessage('All scores have been cleared successfully.');
        fetchUsers();
    } catch (err) {
        console.error('Error clearing scores:', err);
        setMessage(err.message === 'Network Error' ? 'Network Error: Check server connection.' : 'Failed to clear scores.');
    } finally {
        setIsClearScoresModalOpen(false);
    }
  };

  /**
   * Handles the final confirmation to delete ALL users.
   */
  const handleClearAllUsers = async () => {
      try {
          await axios.delete(`${API_URL}/users`);
          setMessage('All users have been deleted.');
          fetchUsers();
      } catch (err) {
          console.error('Error deleting all users:', err);
          setMessage(err.message === 'Network Error' ? 'Network Error: Check server connection.' : 'Failed to delete all users.');
      } finally {
          setIsClearUsersModalOpen(false);
      }
  };

  /**
   * Handles the final confirmation to delete a single user.
   */
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
        await axios.delete(`${API_URL}/users/${userToDelete._id}`);
        setMessage(`User "${userToDelete.name}" was deleted.`);
        setIsDeleteUserModalOpen(false);
        setUserToDelete(null);
        fetchUsers();
    } catch (err) {
        console.error('Error deleting user:', err);
        setMessage(err.message === 'Network Error' ? 'Network Error: Check server connection.' : 'Failed to delete user.');
    } finally {
        setUserToDelete(null);
    }
  };
  
  /**
   * An effect hook that creates a timer to clear notification messages after 4 seconds.
   */
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const topThreeUsers = users.slice(0, 3);

  // --- JSX RENDER ---
  return (
    <>
      <style>{`
        :root { --rank-1-color: #ffd700; --rank-2-color: #c0c0c0; --rank-3-color: #cd7f32; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff; 
            margin: 0; 
            padding: 20px; 
            min-height: 100vh;
        }
        .App { 
            max-width: 700px; 
            margin: 0 auto; 
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 20px 40px; 
            border-radius: 20px; 
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            position: relative; 
        }
        header h1 { text-align: center; color: #fff; margin-bottom: 10px; font-weight: 600; }
        .controls { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); flex-wrap: wrap; gap: 15px; }
        .form-group { display: flex; gap: 10px; flex-grow: 1; }
        input[type="text"], select { 
            padding: 12px; 
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px; 
            font-size: 16px; 
            flex-grow: 1; 
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
        }
        select option { background: #34495e; color: #fff;}
        input::placeholder { color: rgba(255, 255, 255, 0.7); }
        button { padding: 12px 22px; border: none; border-radius: 8px; background: linear-gradient(45deg, #3498db, #8e44ad); color: white; font-size: 16px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; }
        button:hover { box-shadow: 0 0 20px rgba(142, 68, 173, 0.7); transform: translateY(-2px); }
        button:disabled { background: #bdc3c7; cursor: not-allowed; transform: none; box-shadow: none; }
        .message { text-align: center; padding: 12px; margin: 15px 0; border-radius: 8px; background-color: rgba(46, 204, 113, 0.8); color: #fff; font-weight: 500; }
        .leaderboard h2 { text-align: center; color: #fff; margin: 40px 0 20px 0; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; background: rgba(255, 255, 255, 0.15); border-radius: 8px; overflow: hidden;}
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.2); }
        th { background-color: rgba(255, 255, 255, 0.2); font-weight: 500;}
        tbody tr:last-child td { border-bottom: none; }
        td:first-child, th:first-child { font-weight: bold; text-align: center; width: 80px; }
        .loading { text-align: center; padding: 20px; font-size: 1.2em; color: #fff; }
        .error-message { text-align: center; padding: 15px; margin: 15px 0; border-radius: 8px; background-color: rgba(231, 76, 60, 0.8); color: #fff; font-weight: 500; }
        tbody tr td[colSpan="3"] { text-align: center; color: rgba(255, 255, 255, 0.8); padding: 20px; }
        .btn-danger { background: linear-gradient(45deg, #e74c3c, #c0392b); }
        .btn-danger:hover { box-shadow: 0 0 20px rgba(192, 57, 43, 0.7); }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: rgba(52, 73, 94, 0.8); backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.2); padding: 30px; border-radius: 16px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); text-align: center; width: 90%; max-width: 400px; color: #fff; }
        .modal-content h3 { margin-top: 0; font-weight: 500; }
        .modal-actions { margin-top: 20px; display: flex; justify-content: center; gap: 15px; }
        .btn-secondary { background: linear-gradient(45deg, #95a5a6, #7f8c8d); }
        .btn-secondary:hover { box-shadow: 0 0 20px rgba(127, 140, 141, 0.7); }
        .fab { position: fixed; width: 60px; height: 60px; color: white; border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 50%; font-size: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.3s ease; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); }
        .fab:hover { transform: scale(1.1) rotate(15deg); box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
        .add-user-fab { bottom: 30px; right: 30px; font-size: 36px; }
        .delete-user-fab { bottom: 30px; left: 30px; }
        .actions-fab { bottom: 30px; left: 50%; transform: translateX(-50%); }
        .actions-menu { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 10px; background: rgba(52, 73, 94, 0.9); padding: 15px; border-radius: 12px; z-index: 1001; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); }
        .actions-menu button { width: 100%; text-align: left;}
        .podium-container { display: flex; justify-content: center; align-items: flex-end; gap: 5px; margin-top: 30px; height: 200px; }
        .podium-step { width: 30%; text-align: center; color: #333; padding: 10px; border-radius: 8px 8px 0 0; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: inset 0 -5px 15px rgba(0,0,0,0.2); }
        .podium-step.rank-1 { background-color: var(--rank-1-color); height: 100%; }
        .podium-step.rank-2 { background-color: var(--rank-2-color); height: 75%; }
        .podium-step.rank-3 { background-color: var(--rank-3-color); height: 50%; }
        .podium-rank { font-size: 2em; font-weight: bold; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); }
        .podium-name { font-size: 1.2em; font-weight: 600; margin: 5px 0; }
        .podium-points { font-size: 1em; font-weight: 500; }
        .delete-list { list-style: none; padding: 0; margin-top: 20px; max-height: 200px; overflow-y: auto; }
        .delete-list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 6px; }
        .delete-list-item:nth-child(odd) { background: rgba(255,255,255,0.1); }
        .delete-list-item button { font-size: 18px; background: none; box-shadow: none; padding: 5px 10px; }
      `}</style>
      <div className="App">
        {isAddUserModalOpen && (
            <div className="modal-overlay" onClick={() => setIsAddUserModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>Add a New Player</h3>
                    <form onSubmit={handleAddUser}>
                        <div className="form-group">
                            <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Enter new user name" autoFocus/>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setIsAddUserModalOpen(false)}>Cancel</button>
                            <button type="submit">Add User</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {isDeleteUserModalOpen && (
             <div className="modal-overlay" onClick={() => setIsDeleteUserModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>Delete a Player</h3>
                    {users.length > 0 ? (
                        <ul className="delete-list">
                            {users.map(user => (
                                <li key={user._id} className="delete-list-item">
                                    <span>{user.name}</span>
                                    <button className="btn-danger" onClick={() => setUserToDelete(user)}>🗑️</button>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No users to delete.</p>}
                </div>
            </div>
        )}
        {isClearScoresModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Reset All Scores</h3>
              <p>This will reset all scores to 0. This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsClearScoresModalOpen(false)}>Cancel</button>
                <button className="btn-danger" onClick={handleClearAllScores}>Confirm Reset</button>
              </div>
            </div>
          </div>
        )}
        {isClearUsersModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Delete All Users</h3>
              <p>This will permanently delete all users and scores. Are you sure?</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsClearUsersModalOpen(false)}>Cancel</button>
                <button className="btn-danger" onClick={handleClearAllUsers}>Confirm Delete All</button>
              </div>
            </div>
          </div>
        )}
        {userToDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete <strong>{userToDelete.name}</strong>? This cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setUserToDelete(null)}>Cancel</button>
                <button className="btn-danger" onClick={handleDeleteUser}>Delete</button>
              </div>
            </div>
          </div>
        )}

        <button className="fab add-user-fab" onClick={() => setIsAddUserModalOpen(true)}>+</button>
        <button className="fab delete-user-fab" onClick={() => setIsDeleteUserModalOpen(true)}>🗑️</button>
        <button className="fab actions-fab" onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}>⚙️</button>
        
        {isActionsMenuOpen && (
            <div className="actions-menu">
                <button onClick={() => { handleGenerateTenUsers(); setIsActionsMenuOpen(false); }} disabled={isLoading}>Generate 10 Users</button>
                <button className="btn-danger" onClick={() => { setIsClearScoresModalOpen(true); setIsActionsMenuOpen(false); }} disabled={users.length === 0}>Reset All Scores</button>
                <button className="btn-danger" onClick={() => { setIsClearUsersModalOpen(true); setIsActionsMenuOpen(false); }} disabled={users.length === 0}>Delete All Users</button>
            </div>
        )}

        <header>
          <h1>Leaderboard Challenge</h1>
        </header>

        <div className="controls">
          <div className="form-group">
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={users.length === 0}>
              <option value="" disabled>-- Select a User to Claim Points --</option>
              {users.map((user) => (<option key={user._id} value={user._id}>{user.name}</option>))}
            </select>
            <button onClick={handleClaimPoints} disabled={!selectedUserId}>Claim Points</button>
          </div>
        </div>
        
        {message && <div className="message">{message}</div>}
        {isLoading && <div className="loading">Loading...</div>}
        {error && <div className="error-message">{error}</div>}

        {!isLoading && !error && (
          <>
            {topThreeUsers.length > 0 && <Podium topUsers={topThreeUsers} />}
            <div className="leaderboard">
              {users.length > 0 && <h2>Full Rankings</h2>}
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                        <tr key={user._id}>
                            <td>{user.rank}</td>
                            <td>{user.name}</td>
                            <td>{user.points}</td>
                        </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3">No users found. Try deleting all users and restarting the server.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
