'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, AlertCircle, Calendar, Users, Coffee, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

const QUADRANTS = {
  q1: { id: 'q1', title: 'Importante y Urgente', color: 'var(--color-q1)', icon: <AlertCircle size={18} /> },
  q2: { id: 'q2', title: 'Importante y No Urgente', color: 'var(--color-q2)', icon: <Calendar size={18} /> },
  q3: { id: 'q3', title: 'No Importante y Urgente', color: 'var(--color-q3)', icon: <Users size={18} /> },
  q4: { id: 'q4', title: 'No Importante y No Urgente', color: 'var(--color-q4)', icon: <Coffee size={18} /> },
};

export default function MatrixBoard() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState({ q1: [], q2: [], q3: [], q4: [] });
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setTasks({ q1: [], q2: [], q3: [], q4: [] });
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Sync with Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTasks = { q1: [], q2: [], q3: [], q4: [] };
      snapshot.forEach((doc) => {
        const task = { id: doc.id, ...doc.data() };
        if (newTasks[task.quadrant]) {
          newTasks[task.quadrant].push(task);
        }
      });
      
      // Sort tasks by order (if available) or date
      Object.keys(newTasks).forEach(key => {
        newTasks[key].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      });
      
      setTasks(newTasks);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTask,
        quadrant: 'q1',
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewTask('');
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Update in Firestore
    try {
      const taskRef = doc(db, 'tasks', draggableId);
      await updateDoc(taskRef, {
        quadrant: destination.droppableId,
        // We could handle order here too, but for simplicity we keep it quadrant-based
      });
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  if (loading && user) {
    return (
      <div className="flex-center min-h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-container animate-fade">
        <header className="hero-header">
          <h1>Eisenhower Matrix</h1>
          <p>Organiza tu vida con el método de Stephen Covey.</p>
        </header>
        <div className="login-card glass">
          <UserIcon size={48} className="icon-main" />
          <h2>Bienvenido</h2>
          <p>Inicia sesión para sincronizar tus tareas en todos tus dispositivos.</p>
          <button onClick={login} className="login-btn">
            <LogIn size={20} />
            <span>Continuar con Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="board-container">
      <header className="board-header animate-fade">
        <div className="header-top">
          <div className="user-info">
            {user.photoURL && <img src={user.photoURL} alt={user.displayName} />}
            <span>Hola, {user.displayName?.split(' ')[0]}</span>
          </div>
          <button onClick={logout} className="logout-btn glass">
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
        
        <h1>Eisenhower Matrix</h1>
        
        <form onSubmit={addTask} className="add-task-form glass">
          <input 
            type="text" 
            placeholder="Nueva tarea rápida..." 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button type="submit">
            <Plus size={20} />
            <span>Añadir</span>
          </button>
        </form>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="matrix-grid">
          {Object.entries(QUADRANTS).map(([id, column]) => (
            <div key={id} className="quadrant-container animate-fade">
              <div className="quadrant-header" style={{ color: column.color }}>
                {column.icon}
                <h2>{column.title}</h2>
              </div>
              
              <Droppable droppableId={id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={clsx(
                      "task-list glass",
                      snapshot.isDraggingOver && "dragging-over"
                    )}
                  >
                    {tasks[id].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={clsx(
                              "task-card glass-hover",
                              snapshot.isDragging && "is-dragging"
                            )}
                          >
                            <div {...provided.dragHandleProps} className="drag-handle">
                              <GripVertical size={16} />
                            </div>
                            <span className="task-title">{task.title}</span>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="delete-btn"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {tasks[id].length === 0 && !snapshot.isDraggingOver && (
                      <div className="empty-state">No hay tareas</div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <style jsx>{`
        .board-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
        }
        
        .user-info img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--glass-border);
        }
        
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          color: var(--text-secondary);
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition);
          background: transparent;
        }
        
        .logout-btn:hover {
          color: var(--color-q1);
          background: rgba(255, 95, 87, 0.1);
        }
        
        .board-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .board-header h1 {
          font-size: 3rem;
          margin-bottom: 1.5rem;
          background: linear-gradient(to right, var(--text-primary), var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .add-task-form {
          display: flex;
          max-width: 500px;
          margin: 0 auto;
          padding: 0.5rem;
          gap: 0.5rem;
          border-radius: 16px;
        }
        
        .add-task-form input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 0.8rem 1rem;
          font-size: 1rem;
          outline: none;
        }
        
        .add-task-form button {
          background: var(--color-q2);
          color: white;
          border: none;
          padding: 0 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
        }
        
        .matrix-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        
        @media (min-width: 768px) {
          .matrix-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        .quadrant-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .quadrant-header {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0 0.5rem;
        }
        
        .quadrant-header h2 {
          font-size: 1.1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .task-list {
          min-height: 150px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          transition: var(--transition);
        }
        
        .empty-state {
          text-align: center;
          color: var(--text-secondary);
          padding: 2rem;
          font-size: 0.9rem;
          opacity: 0.5;
        }
        
        .dragging-over {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        .task-card {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-radius: 16px;
        }
        
        .drag-handle {
          color: var(--text-secondary);
          cursor: grab;
        }
        
        .task-title {
          flex: 1;
        }
        
        .delete-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.2);
          cursor: pointer;
          transition: var(--transition);
        }
        
        .delete-btn:hover {
          color: var(--color-q1);
        }

        /* Auth Styles */
        .auth-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
          padding: 2rem;
        }
        
        .hero-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .hero-header h1 {
          font-size: 3.5rem;
          margin-bottom: 1rem;
        }
        
        .hero-header p {
          color: var(--text-secondary);
          font-size: 1.2rem;
        }
        
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 3rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }
        
        .icon-main {
          color: var(--color-q2);
          margin-bottom: 1rem;
        }
        
        .login-btn {
          width: 100%;
          background: white;
          color: black;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          cursor: pointer;
          transition: var(--transition);
        }
        
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .flex-center {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .loader {
          width: 40px;
          height: 40px;
          border: 4px solid var(--glass-border);
          border-top-color: var(--color-q2);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
