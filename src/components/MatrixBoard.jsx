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
  const [isDemo, setIsDemo] = useState(false);
  const [tasks, setTasks] = useState({ q1: [], q2: [], q3: [], q4: [] });
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  // Handle Auth
  useEffect(() => {
    if (isDemo) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setTasks({ q1: [], q2: [], q3: [], q4: [] });
        setLoading(false);
      }
    });
    return unsubscribe;
  }, [isDemo]);

  // Sync with Firestore
  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
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
  }, [user, isDemo]);

  const login = () => signInWithPopup(auth, googleProvider);
  const startDemo = () => {
    setIsDemo(true);
    setUser({ uid: 'demo', displayName: 'Invitado (Demo)', photoURL: null });
    setTasks({
      q1: [{ id: 'd1', title: 'Resolver crisis del servidor', quadrant: 'q1' }],
      q2: [{ id: 'd2', title: 'Planificar sprint Q3', quadrant: 'q2' }],
      q3: [{ id: 'd3', title: 'Responder correos no urgentes', quadrant: 'q3' }],
      q4: [{ id: 'd4', title: 'Revisar redes sociales', quadrant: 'q4' }]
    });
  };
  const logout = () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setTasks({ q1: [], q2: [], q3: [], q4: [] });
    } else {
      signOut(auth);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;
    
    const taskData = {
      title: newTask,
      quadrant: 'q1',
      userId: user.uid,
      createdAt: isDemo ? { seconds: Date.now() / 1000 } : serverTimestamp()
    };

    if (isDemo) {
      const newId = 'demo-' + Date.now();
      setTasks(prev => ({
        ...prev,
        q1: [{ id: newId, ...taskData }, ...prev.q1]
      }));
      setNewTask('');
    } else {
      try {
        await addDoc(collection(db, 'tasks'), taskData);
        setNewTask('');
      } catch (err) {
        console.error("Error adding task:", err);
      }
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (isDemo) {
      setTasks(prev => {
        const sourceList = Array.from(prev[source.droppableId]);
        const destList = Array.from(prev[destination.droppableId]);
        const [movedTask] = sourceList.splice(source.index, 1);
        movedTask.quadrant = destination.droppableId;
        
        if (source.droppableId === destination.droppableId) {
          sourceList.splice(destination.index, 0, movedTask);
          return { ...prev, [source.droppableId]: sourceList };
        } else {
          destList.splice(destination.index, 0, movedTask);
          return { ...prev, [source.droppableId]: sourceList, [destination.droppableId]: destList };
        }
      });
    } else {
      try {
        const taskRef = doc(db, 'tasks', draggableId);
        await updateDoc(taskRef, {
          quadrant: destination.droppableId,
        });
      } catch (err) {
        console.error("Error updating task:", err);
      }
    }
  };

  const deleteTask = async (taskId) => {
    if (isDemo) {
      setTasks(prev => {
        const newTasks = { ...prev };
        Object.keys(newTasks).forEach(q => {
          newTasks[q] = newTasks[q].filter(t => t.id !== taskId);
        });
        return newTasks;
      });
    } else {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (err) {
        console.error("Error deleting task:", err);
      }
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
        <div className="ambient-glow"></div>
        <header className="hero-section">
          <div className="hero-content">
            <div className="badge glass-badge">Gestión de Tiempo Inteligente</div>
            <h1 className="hero-title">Prioriza lo que <br/><span className="gradient-text">Realmente Importa</span></h1>
            <p className="hero-subtitle">La Matriz de Eisenhower transforma la forma en que trabajas. Separa lo urgente de lo importante y recupera el control de tu día.</p>
            
            <div className="cta-group">
              <button onClick={login} className="btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" className="google-icon">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continuar con Google</span>
              </button>
              <button onClick={startDemo} className="btn-secondary glass">
                Probar Demo Sin Registro
              </button>
            </div>
            <p className="privacy-note">Sincronización segura con Google Firebase.</p>
          </div>
          
          <div className="hero-visual">
             <div className="mockup-board glass">
                <div className="mockup-header">
                  <div className="dots"><span className="red"></span><span className="yellow"></span><span className="green"></span></div>
                </div>
                <div className="bento-matrix">
                  <div className="bento-box b-q1"><div className="b-icon"><AlertCircle size={20}/></div><div className="b-line w-full"></div><div className="b-line w-3/4"></div></div>
                  <div className="bento-box b-q2"><div className="b-icon"><Calendar size={20}/></div><div className="b-line w-full"></div><div className="b-line w-1/2"></div></div>
                  <div className="bento-box b-q3"><div className="b-icon"><Users size={20}/></div><div className="b-line w-full"></div></div>
                  <div className="bento-box b-q4"><div className="b-icon"><Coffee size={20}/></div><div className="b-line w-3/4"></div></div>
                </div>
             </div>
          </div>
        </header>

        <section className="features-bento">
          <div className="bento-title">
            <h2>El método de la <span className="text-white">Productividad Elite</span></h2>
          </div>
          <div className="bento-grid">
            {Object.entries(QUADRANTS).map(([id, q]) => (
              <div key={id} className={`bento-item glass item-${id}`}>
                <div className="bento-icon-wrapper" style={{ background: `${q.color}15`, color: q.color, border: `1px solid ${q.color}30` }}>
                  {q.icon}
                </div>
                <h3>{q.title}</h3>
                <p>
                  {id === 'q1' && "Tareas críticas con plazos inminentes. Resuélvelas de inmediato para evitar crisis."}
                  {id === 'q2' && "Estrategia, relaciones y crecimiento. Aquí es donde los líderes invierten su tiempo."}
                  {id === 'q3' && "Interrupciones de terceros. Si puedes, delégalas o automatízalas."}
                  {id === 'q4' && "Actividades que no aportan valor a tus objetivos. Identifícalas y elimínalas."}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <p>© 2026 Eisenhower App. Diseñado con 💙</p>
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
         /* Landing Page Premium Styles */
        .landing-wrapper {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          padding: 6rem 2rem;
          min-height: 100vh;
        }

        .ambient-glow {
          position: absolute;
          top: -10%;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          height: 60vh;
          background: radial-gradient(circle, rgba(75,163,255,0.15) 0%, rgba(255,95,87,0.05) 50%, transparent 70%);
          z-index: -1;
          filter: blur(80px);
        }

        .hero-section {
          display: grid;
          grid-template-columns: 1fr;
          gap: 5rem;
          align-items: center;
          margin-bottom: 8rem;
        }

        @media (min-width: 992px) {
          .hero-section {
            grid-template-columns: 1fr 1fr;
          }
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1.5rem;
        }

        .glass-badge {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-secondary);
        }

        .hero-title {
          font-size: clamp(3rem, 6vw, 4.5rem);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 90%;
        }

        .cta-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
          width: 100%;
        }

        .btn-primary {
          background: white;
          color: black;
          border: none;
          padding: 1rem 1.8rem;
          border-radius: 100px;
          font-weight: 600;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          gap: 0.8rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(255,255,255,0.2);
        }

        .btn-secondary {
          background: rgba(255,255,255,0.05);
          color: white;
          padding: 1rem 1.8rem;
          border-radius: 100px;
          font-weight: 600;
          font-size: 1.05rem;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
        }

        .google-icon {
          width: 22px;
          height: 22px;
        }

        .hero-visual {
          position: relative;
          perspective: 1000px;
        }

        .mockup-board {
          background: rgba(20,20,25,0.6);
          border-radius: 20px;
          padding: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          transform: rotateY(-5deg) rotateX(5deg);
          transition: transform 0.5s ease;
        }

        .mockup-board:hover {
          transform: rotateY(0) rotateX(0);
        }

        .mockup-header {
          padding: 0.5rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .dots {
          display: flex;
          gap: 6px;
        }

        .dots span {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .red { background: #ff5f56; }
        .yellow { background: #ffbd2e; }
        .green { background: #27c93f; }

        .bento-matrix {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          aspect-ratio: 1;
        }

        .bento-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .b-icon {
          opacity: 0.8;
          margin-bottom: auto;
        }
        .b-q1 .b-icon { color: var(--color-q1); }
        .b-q2 .b-icon { color: var(--color-q2); }
        .b-q3 .b-icon { color: var(--color-q3); }
        .b-q4 .b-icon { color: var(--color-q4); }

        .b-line {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .w-full { width: 100%; }
        .w-3\/4 { width: 75%; }
        .w-1\/2 { width: 50%; }

        /* Features Bento */
        .features-bento {
          margin-bottom: 4rem;
        }

        .bento-title {
          text-align: center;
          margin-bottom: 4rem;
        }

        .bento-title h2 {
          font-size: 2.5rem;
          color: var(--text-secondary);
        }

        .text-white { color: white; }

        .bento-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .bento-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .item-q1 { grid-column: span 2; }
          .item-q4 { grid-column: span 2; }
        }

        @media (min-width: 1024px) {
          .bento-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .item-q1 { grid-column: span 2; grid-row: span 2; }
          .item-q4 { grid-column: span 1; }
        }

        .bento-item {
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-radius: 24px;
        }

        .bento-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bento-item h3 {
          font-size: 1.5rem;
          margin-top: 1rem;
        }

        .bento-item p {
          color: var(--text-secondary);
          line-height: 1.6;
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
