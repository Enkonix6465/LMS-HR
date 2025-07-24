import React from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface Event {
  day: number;
  name: string;
  description: string;
  date?: Date;
}

interface EventsListProps {
  events: Event[];
}

const EventsList: React.FC<EventsListProps> = ({ events }) => {
  if (events.length === 0) {
    return <div className="text-gray-500 dark:text-gray-400">No upcoming events</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const eventDate = event.date || new Date();
        const isEventToday = isToday(eventDate);
        const isEventTomorrow = isTomorrow(eventDate);
        
        return (
          <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{event.name}</h3>
                <p className="text-gray-600 dark:text-gray-300">{event.description}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {isEventToday 
                    ? 'Today' 
                    : isEventTomorrow 
                      ? 'Tomorrow' 
                      : format(eventDate, 'MMM d')}
                </div>
                {!isEventToday && !isEventTomorrow && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(eventDate, 'EEEE')}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EventsList;
