'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, GripVertical, AlertCircle, Calendar, Users, Coffee, LogIn, LogOut, User as UserIcon, Check, Edit2, Inbox, Save, X } from 'lucide-react';
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
  inbox: { id: 'inbox', title: 'Bandeja de Entrada', color: '#a0a0a0', icon: <Inbox size={18} /> },
  q1: { id: 'q1', title: 'Importante y Urgente', color: 'var(--color-q1)', icon: <AlertCircle size={18} /> },
  q2: { id: 'q2', title: 'Importante y No Urgente', color: 'var(--color-q2)', icon: <Calendar size={18} /> },
  q3: { id: 'q3', title: 'No Importante y Urgente', color: 'var(--color-q3)', icon: <Users size={18} /> },
  q4: { id: 'q4', title: 'No Importante y No Urgente', color: 'var(--color-q4)', icon: <Coffee size={18} /> },
};

export default function MatrixBoard() {
  const [user, setUser] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [tasks, setTasks] = useState({ inbox: [], q1: [], q2: [], q3: [], q4: [] });
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeAddQuadrant, setActiveAddQuadrant] = useState(null);
  const [inlineTask, setInlineTask] = useState('');

  // Handle Auth
  useEffect(() => {
    if (isDemo) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setTasks({ inbox: [], q1: [], q2: [], q3: [], q4: [] });
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
      const newTasks = { inbox: [], q1: [], q2: [], q3: [], q4: [] };
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

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Firebase Login Error:", err.code, err.message);
      alert(`Error de autenticación: ${err.message}. Asegúrate de que el dominio está autorizado en la consola de Firebase.`);
    }
  };

  const startDemo = () => {
    setIsDemo(true);
    setUser({ uid: 'demo', displayName: 'Invitado (Demo)', photoURL: null });
    setTasks({
      inbox: [{ id: 'd0', title: 'Nuevas ideas de negocio', quadrant: 'inbox', completed: false }],
      q1: [{ id: 'd1', title: 'Resolver crisis del servidor', quadrant: 'q1', completed: false }],
      q2: [{ id: 'd2', title: 'Planificar sprint Q3', quadrant: 'q2', completed: false }],
      q3: [{ id: 'd3', title: 'Responder correos no urgentes', quadrant: 'q3', completed: false }],
      q4: [{ id: 'd4', title: 'Revisar redes sociales', quadrant: 'q4', completed: true }]
    });
  };

  const logout = () => {
    if (isDemo) {
      setIsDemo(false);
      setUser(null);
      setTasks({ inbox: [], q1: [], q2: [], q3: [], q4: [] });
    } else {
      signOut(auth);
    }
  };

  const addTask = async (e, quadrant = 'inbox') => {
    if (e) e.preventDefault();
    const titleToAdd = quadrant === 'inbox' ? newTask : inlineTask;
    if (!titleToAdd.trim() || !user) return;
    
    const taskData = {
      title: titleToAdd,
      quadrant: quadrant,
      completed: false,
      userId: user.uid,
      createdAt: isDemo ? { seconds: Date.now() / 1000 } : serverTimestamp()
    };

    if (isDemo) {
      const newId = 'demo-' + Date.now();
      setTasks(prev => ({
        ...prev,
        [quadrant]: [{ id: newId, ...taskData }, ...prev[quadrant]]
      }));
      if (quadrant === 'inbox') setNewTask('');
      else {
        setInlineTask('');
        setActiveAddQuadrant(null);
      }
    } else {
      try {
        await addDoc(collection(db, 'tasks'), taskData);
        if (quadrant === 'inbox') setNewTask('');
        else {
          setInlineTask('');
          setActiveAddQuadrant(null);
        }
      } catch (err) {
        console.error("Error adding task:", err);
      }
    }
  };

  const toggleComplete = async (task) => {
    if (isDemo) {
      setTasks(prev => {
        const newTasks = { ...prev };
        newTasks[task.quadrant] = newTasks[task.quadrant].map(t => 
          t.id === task.id ? { ...t, completed: !t.completed } : t
        );
        return newTasks;
      });
    } else {
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          completed: !task.completed
        });
      } catch (err) {
        console.error("Error toggling complete:", err);
      }
    }
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
  };

  const saveEdit = async (task) => {
    if (!editTitle.trim()) return;
    if (isDemo) {
      setTasks(prev => {
        const newTasks = { ...prev };
        newTasks[task.quadrant] = newTasks[task.quadrant].map(t => 
          t.id === task.id ? { ...t, title: editTitle } : t
        );
        return newTasks;
      });
    } else {
      try {
        await updateDoc(doc(db, 'tasks', task.id), {
          title: editTitle
        });
      } catch (err) {
        console.error("Error editing task:", err);
      }
    }
    setEditingTaskId(null);
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
    <div className="main-layout animate-fade">
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Sidebar Inbox - Hidden or compact on mobile */}
        <aside className="sidebar-inbox">
          <div className="sidebar-header">
            <div className="flex items-center justify-between w-full">
              <h2><Inbox size={22}/> Bandeja</h2>
            </div>
            <p className="text-secondary text-xs opacity-70">Captura tus pensamientos sin filtros.</p>
          </div>

          <form onSubmit={(e) => addTask(e, 'inbox')} className="add-task-form compact">
            <input 
              type="text" 
              placeholder="Nueva idea..." 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onFocus={(e) => e.target.placeholder = ""}
              onBlur={(e) => e.target.placeholder = "Nueva idea..."}
            />
            <button type="submit" className="add-btn-circle"><Plus size={18}/></button>
          </form>

          <Droppable droppableId="inbox">
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={clsx('task-list scrollbar-hide', snapshot.isDraggingOver && 'dragging-over')}
              >
                {tasks.inbox.map((task, index) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    index={index} 
                    deleteTask={deleteTask}
                    toggleComplete={toggleComplete}
                    isEditing={editingTaskId === task.id}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    startEditing={startEditing}
                    saveEdit={saveEdit}
                    cancelEdit={() => setEditingTaskId(null)}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </aside>

        {/* Main Grid Area */}
        <main className="content-area">
          <nav className="board-nav">
             <div className="logo-text gradient-text">TIME</div>
             <div className="flex items-center gap-4">
                <div className="user-pill discrete">
                   <div className="user-avatar">{user.displayName?.[0] || 'U'}</div>
                   <span className="hidden sm:inline">{user.displayName?.split(' ')[0]}</span>
                </div>
                <button onClick={logout} className="action-btn text-red-400 hover:bg-red-500/10 p-2 rounded-full" title="Salir">
                  <LogOut size={18}/>
                </button>
             </div>
          </nav>

          <div className="matrix-container full-height">
            {Object.entries(QUADRANTS).filter(([id]) => id !== 'inbox').map(([id, q]) => (
              <div key={id} className="quadrant-box glass">
                <div className="quadrant-header">
                  <div className="flex items-center gap-3">
                    <span className="q-icon-box" style={{ color: q.color }}>{q.icon}</span>
                    <h2 className="text-sm font-bold uppercase tracking-wider">{q.title}</h2>
                  </div>
                  <button 
                    onClick={() => setActiveAddQuadrant(activeAddQuadrant === id ? null : id)}
                    className={clsx("add-inline-trigger", activeAddQuadrant === id && "active")}
                  >
                    <Plus size={16}/>
                  </button>
                </div>

                {activeAddQuadrant === id && (
                  <form 
                    onSubmit={(e) => addTask(e, id)} 
                    className="inline-add-form animate-slide-down"
                  >
                    <input 
                      autoFocus
                      placeholder="¿Qué sigue?" 
                      value={inlineTask}
                      onChange={(e) => setInlineTask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setActiveAddQuadrant(null)}
                    />
                  </form>
                )}

                <Droppable droppableId={id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={clsx('task-list quadrant-list', snapshot.isDraggingOver && 'dragging-over')}
                    >
                      {tasks[id].map((task, index) => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          index={index} 
                          deleteTask={deleteTask}
                          toggleComplete={toggleComplete}
                          isEditing={editingTaskId === task.id}
                          editTitle={editTitle}
                          setEditTitle={setEditTitle}
                          startEditing={startEditing}
                          saveEdit={saveEdit}
                          cancelEdit={() => setEditingTaskId(null)}
                        />
                      ))}
                      {provided.placeholder}
                      {tasks[id].length === 0 && !snapshot.isDraggingOver && !activeAddQuadrant && (
                        <div className="empty-state-minimal">Listo.</div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </main>
      </DragDropContext>
    </div>
  );
}

// Sub-component for Task Item
function TaskItem({ task, index, deleteTask, toggleComplete, isEditing, editTitle, setEditTitle, startEditing, saveEdit, cancelEdit }) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={clsx(
            'task-card',
            task.completed && 'completed',
            snapshot.isDragging && 'dragging'
          )}
        >
          <div {...provided.dragHandleProps} className="drag-handle text-gray-400">
            <GripVertical size={16} />
          </div>
          
          <div 
            onClick={() => toggleComplete(task)}
            className="task-checkbox"
          >
            {task.completed && <Check size={14} color="#ffffff" strokeWidth={3} />}
          </div>

          {isEditing ? (
            <input 
              autoFocus
              className="edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit(task)}
            />
          ) : (
            <span 
              className="task-text-content"
              onClick={() => toggleComplete(task)}
            >
              {task.title}
            </span>
          )}

          <div className="task-actions">
            {isEditing ? (
              <>
                <button onClick={() => saveEdit(task)} className="action-btn text-blue-400"><Save size={16}/></button>
                <button onClick={cancelEdit} className="action-btn"><X size={16}/></button>
              </>
            ) : (
              <>
                <button onClick={() => startEditing(task)} className="action-btn"><Edit2 size={16}/></button>
                <button onClick={() => deleteTask(task.id)} className="action-btn btn-delete"><Trash2 size={16}/></button>
              </>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
