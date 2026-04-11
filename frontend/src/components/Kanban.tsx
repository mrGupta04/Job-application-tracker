import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Application,
  APPLICATION_STATUSES,
  ApplicationStatus,
  useUpdateApplication,
} from '../hooks/useApplications';
import { isApplicationOverdue, toLocalDateInputValue } from '../utils/application';

interface KanbanProps {
  applications: Application[];
  onCardClick: (application: Application) => void;
}

const Kanban = ({ applications, onCardClick }: KanbanProps) => {
  const updateApplication = useUpdateApplication();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    updateApplication.mutate({
      id: draggableId,
      data: { status: destination.droppableId as ApplicationStatus },
    });
  };

  const grouped = APPLICATION_STATUSES.reduce<Record<ApplicationStatus, Application[]>>((acc, col) => {
    acc[col] = applications.filter((app) => app.status === col);
    return acc;
  }, {} as Record<ApplicationStatus, Application[]>);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {applications.length === 0 && (
        <div className="px-4 pt-2 text-sm text-slate-600 dark:text-slate-300">
          No applications yet. Click <span className="font-semibold">Add Application</span> to create your first card.
        </div>
      )}
      <div className="flex space-x-4 p-4 overflow-x-auto">
        {APPLICATION_STATUSES.map((col) => (
          <div key={col} className="min-h-96 w-64 rounded bg-gray-100 p-4 dark:bg-slate-800">
            <h3 className="mb-4 font-bold dark:text-slate-100">{col}</h3>
            <Droppable droppableId={col}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {grouped[col]?.map((app, index) => (
                    <Draggable key={app._id} draggableId={app._id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-pointer rounded p-4 shadow transition ${
                            isApplicationOverdue(app)
                              ? 'border border-amber-500 bg-amber-50 dark:border-amber-400 dark:bg-amber-900/30'
                              : 'bg-white dark:bg-slate-900'
                          }`}
                          onClick={() => onCardClick(app)}
                        >
                          <h4 className="font-semibold dark:text-slate-100">{app.company}</h4>
                          <p className="dark:text-slate-200">{app.role}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            Applied: {new Date(app.dateApplied).toLocaleDateString()}
                          </p>
                          {app.followUpDate && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              Follow-up: {toLocalDateInputValue(app.followUpDate)}
                            </p>
                          )}
                          <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">Status: {app.status}</p>
                          {isApplicationOverdue(app) && (
                            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Overdue follow-up</p>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default Kanban;
