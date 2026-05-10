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
      <div className="landing-wrapper animate-fade">
        <header className="hero-section">
          <div className="hero-content">
            <span className="badge">Gestión de Tiempo Pro</span>
            <h1>Domina tu día con la <span className="gradient-text">Matriz Eisenhower</span></h1>
            <p>La herramienta definitiva para priorizar lo que realmente importa y eliminar lo innecesario.</p>
            
            <div className="login-card-compact glass">
              <button onClick={login} className="google-btn">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Empezar ahora con Google</span>
              </button>
              <p className="privacy-note">Tus datos están seguros y sincronizados.</p>
            </div>
          </div>
          
          <div className="hero-matrix-preview glass">
             <div className="mini-matrix">
                <div className="mini-q q1"></div>
                <div className="mini-q q2"></div>
                <div className="mini-q q3"></div>
                <div className="mini-q q4"></div>
             </div>
          </div>
        </header>

        <section className="explanation-grid">
          {Object.entries(QUADRANTS).map(([id, q]) => (
            <div key={id} className="info-card glass">
              <div className="info-icon" style={{ background: `${q.color}20`, color: q.color }}>
                {q.icon}
              </div>
              <h3>{q.title}</h3>
              <p>
                {id === 'q1' && "Tareas críticas que requieren atención inmediata. Hazlas ahora."}
                {id === 'q2' && "Objetivos a largo plazo y prevención. Planifica tiempo para estas."}
                {id === 'q3' && "Interrupciones que parecen urgentes pero no aportan. Delégalas."}
                {id === 'q4' && "Distracciones y pérdida de tiempo. Intenta eliminarlas."}
              </p>
            </div>
          ))}
        </section>

        <footer className="landing-footer">
          <p>© 2026 Eisenhower Matrix App • <a href="#">Privacidad</a> • <a href="#">Términos</a></p>
        </footer>
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
        /* Landing Page Styles */
        .landing-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }

        .hero-section {
          display: grid;
          grid-template-columns: 1fr;
          gap: 4rem;
          align-items: center;
          margin-bottom: 6rem;
        }

        @media (min-width: 992px) {
          .hero-section {
            grid-template-columns: 1.2fr 0.8fr;
          }
        }

        .hero-content h1 {
          font-size: clamp(2.5rem, 5vw, 4rem);
          line-height: 1.1;
          margin: 1.5rem 0;
          font-weight: 800;
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--color-q2), var(--color-q1));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .badge {
          background: rgba(75, 163, 255, 0.1);
          color: var(--color-q2);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .hero-content p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }

        .login-card-compact {
          padding: 1.5rem;
          max-width: 350px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .google-btn {
          background: white;
          color: #1a1a1a;
          border: none;
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.8rem;
          cursor: pointer;
          transition: var(--transition);
        }

        .google-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .privacy-note {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-align: center;
          opacity: 0.7;
        }

        .hero-matrix-preview {
          aspect-ratio: 1;
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .mini-matrix {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 80%;
          height: 80%;
        }

        .mini-q {
          border-radius: 12px;
          opacity: 0.3;
          animation: pulse 3s infinite alternate;
        }

        .q1 { background: var(--color-q1); animation-delay: 0s; }
        .q2 { background: var(--color-q2); animation-delay: 0.5s; }
        .q3 { background: var(--color-q3); animation-delay: 1s; }
        .q4 { background: var(--color-q4); animation-delay: 1.5s; }

        @keyframes pulse {
          from { opacity: 0.2; transform: scale(0.95); }
          to { opacity: 0.5; transform: scale(1.05); }
        }

        .explanation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 6rem;
        }

        .info-card {
          padding: 2.5rem;
          transition: var(--transition);
        }

        .info-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255,255,255,0.2);
        }

        .info-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .info-card h3 {
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }

        .info-card p {
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .landing-footer {
          text-align: center;
          padding: 2rem;
          border-top: 1px solid var(--glass-border);
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .landing-footer a {
          color: var(--text-primary);
          text-decoration: none;
          margin: 0 0.5rem;
        }

        /* Rest of the board styles... */
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
          font-size: clamp(2rem, 5vw, 3rem);
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
