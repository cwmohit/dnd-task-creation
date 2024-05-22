import React, { useState, useEffect, FormEvent } from "react";
import {
  DndProvider,
  useDrag,
  useDrop,
  DragSourceMonitor,
  DropTargetMonitor,
} from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";

interface Task {
  id: string;
  text: string;
  status: "Backlog" | "In Progress" | "Done";
}

interface DragItem {
  id: string;
  type: string;
}

const ItemType = "TASK";

const TaskComponent: React.FC<{ id: string; text: string; onDelete: (id: string) => void }> = ({
  id,
  text,
  onDelete,
}) => {
  const [{ isDragging }, drag] = useDrag<
    DragItem,
    void,
    { isDragging: boolean }
  >({
    type: ItemType,
    item: { id, type: ItemType },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`border border-gray-200 px-2 py-2 min-h-[80px] md:min-h-[120px] overflow-auto rounded-md cursor-pointer shadow-md relative ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {text}
      <button
        onClick={() => onDelete(id)}
        className="absolute top-1 right-1 text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      </button>
    </div>
  );
};

interface ColumnProps {
  title: string;
  tasks: Task[];
  onDropTask: (
    id: string,
    newStatus: "Backlog" | "In Progress" | "Done"
  ) => void;
  onDeleteTask: (id: string) => void;
}

const Column: React.FC<ColumnProps> = ({ title, tasks, onDropTask, onDeleteTask }) => {
  const [, drop] = useDrop<DragItem>({
    accept: ItemType,
    drop: (item: DragItem, monitor: DropTargetMonitor) => {
      onDropTask(item.id, title as "Backlog" | "In Progress" | "Done");
    },
  });

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className="h-full border-r border-gray-300 flex flex-col"
    >
      <h1 className="text-sm md:text-3xl font-bold text-center border border-gray-300 py-4 bg-gray-200">
        {title}
      </h1>
      <div className="p-2 flex-1 flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskComponent key={task.id} id={task.id} text={task.text} onDelete={onDeleteTask} />
        ))}
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskText, setTaskText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "tasks"));
      const tasksData = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Task[];
      setTasks(tasksData);
      setLoading(false);
    };

    fetchTasks();
  }, []);

  const moveTask = async (
    id: string,
    newStatus: "Backlog" | "In Progress" | "Done"
  ) => {
    const taskDoc = doc(db, "tasks", id);
    await updateDoc(taskDoc, { status: newStatus });
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, status: newStatus } : task
      )
    );
  };

  const addTask = async (event: FormEvent) => {
    event.preventDefault();
    if (taskText.trim()) {
      const newTask: Omit<Task, "id"> = {
        text: taskText,
        status: "Backlog",
      };
      const docRef = await addDoc(collection(db, "tasks"), newTask);
      setTasks((prevTasks) => [...prevTasks, { ...newTask, id: docRef.id }]);
      setTaskText("");
    }
  };

  const deleteTask = async (id: string) => {
    const taskDoc = doc(db, "tasks", id);
    await deleteDoc(taskDoc);
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const getTasksByStatus = (status: "Backlog" | "In Progress" | "Done") =>
    tasks.filter((task) => task.status === status);

  return (
    <DndProvider backend={HTML5Backend}>
      <main className={`w-full md:w-4/5 m-auto min-h-screen p-4 md:p-0 md:my-6 bg-white flex flex-col md:rounded-t-xl`}>
        <form className="flex w-full md:w-3/5 my-4 gap-3 mx-auto" onSubmit={addTask}>
          <input
            className="border border-gray-300 rounded-lg h-12 mx-auto w-full self-start px-2"
            name="task"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
          />
          <button
            className={`font-bold text-black w-[120px] bg-gray-300 py-3 rounded-lg self-start ${taskText.length === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-500 hover:text-white'}`}
            type="submit"
            disabled={taskText.length === 0}
          >
            + Add
          </button>
        </form>

        {loading ? (
          <div className="w-full h-full flex items-center justify-center pt-10">
            <div
              className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full"
              role="status"
            ></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 h-full mt-6 flex-1">
            <Column
              title="Backlog"
              tasks={getTasksByStatus("Backlog")}
              onDropTask={moveTask}
              onDeleteTask={deleteTask}
            />
            <Column
              title="In Progress"
              tasks={getTasksByStatus("In Progress")}
              onDropTask={moveTask}
              onDeleteTask={deleteTask}
            />
            <Column
              title="Done"
              tasks={getTasksByStatus("Done")}
              onDropTask={moveTask}
              onDeleteTask={deleteTask}
            />
          </div>
        )}
      </main>
    </DndProvider>
  );
};

export default Home;