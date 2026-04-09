import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useApplications, useUpdateApplication } from '../hooks/useApplications';

const columns = ['Applied', 'Phone Screen', 'Interview', 'Offer', 'Rejected'];

const Kanban = () => {
  const { data: applications, isLoading } = useApplications();
  const updateApplication = useUpdateApplication();

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    updateApplication.mutate({ id: draggableId, data: { status: destination.droppableId } });
  };

  if (isLoading) return <div>Loading...</div>;

  const grouped = columns.reduce((acc, col) => {
    acc[col] = applications?.filter(app => app.status === col) || [];
    return acc;
  }, {} as Record<string, typeof applications>);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex space-x-4 p-4 overflow-x-auto">
        {columns.map(col => (
          <div key={col} className="w-64 bg-gray-100 p-4 rounded min-h-96">
            <h3 className="font-bold mb-4">{col}</h3>
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
                          className="bg-white p-4 rounded shadow cursor-pointer"
                          onClick={() => {/* TODO: open detail */}}
                        >
                          <h4 className="font-semibold">{app.company}</h4>
                          <p>{app.role}</p>
                          <p className="text-sm text-gray-500">{new Date(app.dateApplied).toLocaleDateString()}</p>
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